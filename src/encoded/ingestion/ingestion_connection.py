from collections.abc import Generator
from typing import Callable, Optional, Union
from urllib.parse import parse_qs, urlencode, urlparse, urlunsplit
import uuid
from dcicutils.ff_utils import get_metadata, search_metadata
from dcicutils.misc_utils import VirtualApp

# IngestionConnection encapsulates some basic ontology related queries.
# Works via either (HTTP) connection to the portal via ff_utils, or with a VirtualApp
# which will call directly back into this process. The former is (typically) used when
# called via command-line (e.g. generate-ontology); the latter (typically) when called
# from the ingester process (i.e. ingestion_listener) itself.
class IngestionConnection:

    # The maximum number of records to retrieve at a time via get_result_set.
    _MAX_RESULTS_PER_PAGE = 2000

    def __init__(self, connection_or_vapp: Union[dict, VirtualApp]) -> None:
        if isinstance(connection_or_vapp, dict):
            self.connection = connection_or_vapp
            self.vapp = None
        elif isinstance(connection_or_vapp, VirtualApp):
            self.connection = None
            self.vapp = connection_or_vapp
        else:
            raise Exception("Error creating IngestionConnection")

    def get_ontologies_set(self,
                           limit: Optional[int] = None,
                           ignore: Optional[Callable] = None) -> Generator:
        """
        Returns a generator for paging through all available ontologies.
        N.B. The limit argument is really only for testing/troublshooting to limits
        the TOTAL number of results returned; not related to the limit variable
        used internally in this module to limit results per page for paging.
        """
        return self.get_result_set("search/?type=Ontology", limit, ignore)

    def get_ontologies(self,
                       limit: Optional[int] = None,
                       ignore: Optional[Callable] = None) -> list:
        """
        Same as get_ontologies_set but executes the returned generator and returns as a list.
        """
        # TODO: cache/memoize this?
        return list(self.get_ontologies_set(limit=limit, ignore=ignore))

    def get_ontology(self, ontology_uuid: str) -> Optional[dict]:
        """
        Returns the ontology (dictionary) for the given uuid or None if not found.
        """
        if self._is_uuid(ontology_uuid):
            query = self._normalize_query(f"ontologys/{ontology_uuid}/")
            return self.get_result(query)
        else:
            # Looks like the given ontology is a actually name rather than a uuid.
            # look it up its uuid in the list of all ontologies (via get_ontologies;
            ontologies = self.get_ontologies()
            if not ontologies:
                return None
            ontology_uuid = [ontology["uuid"] for ontology in ontologies if ontology["ontology_prefix"] == ontology_uuid]
            if len(ontology_uuid) == 0:
                return None
            if len(ontology_uuid) > 1:
                raise Exception(f"Too many ontologies returned for: {ontology_uuid}")
            ontology_uuid = ontology_uuid[0]
            if not self._is_uuid(ontology_uuid):
                raise Exception(f"Invalid uuid for ontology: {ontology_uuid}")
            return self.get_ontology(ontology_uuid)

    def get_ontology_terms_set(self,
                               category: Optional[str] = None,
                               limit: Optional[int] = None,
                               ignore: Optional[Callable] = None) -> Generator:
        """
        Returns a generator for paging through all available ontology terms.
        N.B. The limit argument is really only for testing/troublshooting to limits
        the TOTAL number of results returned; not related to the limit variable
        used internally in this module to limit results per page for paging.
        """
        if category:
            return self.get_result_set(f"search/?type=OntologyTerm&is_slim_for={category}", limit, ignore)
        else:
            # TODO: What exactly do status=released and status=obsolete do?
            return self.get_result_set(f"search/?type=OntologyTerm&status=released&status=obsolete", limit, ignore)

    def get_ontology_terms(self,
                           category: Optional[str] = None,
                           limit: Optional[int] = None,
                           ignore: Optional[Callable] = None) -> list:
        """
        Same as get_ontology_terms_set but executes the returned generator and returns as a list.
        N.B. The limit argument is really only for testing/troublshooting to limits
        the TOTAL number of results returned; not related to the limit variable
        used internally in this module to limit results per page for paging.
        """
        return list(self.get_ontology_terms_set(category=category, limit=limit, ignore=ignore))

    def get_ontology_term(self, ontology_term_uuid: str) -> Optional[dict]:
        """
        Returns the ontology term (dictionary) for the given uuid or None if not found.
        """
        return self.get_result(f"search/?type=OntologyTerm&uuid={ontology_term_uuid}")

    def get_ontology_term_links(self, ontology_term_uuid: str) -> Optional[dict]:
        """
        Returns the ontology term links (dictionary) for the given uuid or None if not found.
        """
        return self.get_result(f"ontology-terms/{ontology_term_uuid}/@@links")

    def get_result_set(self, query: str,
                       limit: Optional[int] = None,
                       ignore: Optional[Callable] = None) -> Generator:
        """
        Returns a generator for paging through a list of results for the given query.
        N.B. The limit argument is really only for testing/troublshooting to limits
        the TOTAL number of results returned; not related to the limit variable
        used internally in this module to limit results per page for paging.
        """
        limit = self._parse_limit_or_offset(limit)
        offset = 0
        while True:
            query = self._create_result_set_query(query, limit, offset)
            try:
                if self.connection:
                    response = search_metadata(query, self.connection, page_limit=self._MAX_RESULTS_PER_PAGE, is_generator=True)
                else:
                    response = self.vapp.get(query).json["@graph"]
            except Exception as e:
                break
            if not response:
                break
            if limit and offset >= limit:
                # A total limit count was specified and we have reached it.
                break
            offset_before_iteration = offset
            for item in response: 
                offset += 1
                if not isinstance(ignore, Callable) or not ignore(item):
                    yield item
            if offset == offset_before_iteration:
                # No results in this result set (page); we are done.
                break

    def get_results(self, query: str,
                    limit: Optional[int] = None,
                    ignore: Optional[Callable] = None) -> list:
        """
        Same as get_result_set but executes the returned generator and returns as a list.
        N.B. The limit argument is really only for testing/troublshooting to limits
        the TOTAL number of results returned; not related to the limit variable
        used internally in this module to limit results per page for paging.
        """
        return list(self.get_result_set(query, limit, ignore))

    def get_result(self, query: str) -> Optional[Union[dict]]:
        """
        Returns a single result for the given query.
        """
        query = self._normalize_query(query)
        try:
            if self.connection:
                response = get_metadata(query, self.connection)
            else:
                response = self.vapp.get(query).json
        except Exception:
            return None
        if not query.endswith("/@@links"):
            response_graph = response.get("@graph")
            if response_graph:
                response = response_graph
            if isinstance(response, list):
                if len(response) == 0:
                    return None
                if len(response) > 1:
                    raise Exception(f"Too many results returned for: {query}")
                response = response[0]
        if not isinstance(response, dict):
            raise Exception(f"Unexpected result type: {type(response)}")
        return response

    def _create_result_set_query(self,
                                 query: str,
                                 limit: Optional[int] = None, offset: Optional[int] = None,
                                 sort: Optional[str] = "uuid") -> str:
        """
        Returns the given URL-style query (could be a full URL or just the path) augmented with
        the given limit, offset (i.e. from), and/or sort query string arguments if they are set.
        """
        url = urlparse(query)
        args = parse_qs(url.query)
        if limit is not None:
            args["limit"] = limit
        elif not args.get("limit"):
            args["limit"] = self._MAX_RESULTS_PER_PAGE
        if offset is not None:
            args["from"] = offset
        if sort:
            args["sort"] = sort
        args = "&".join(f"{'&'.join(f'{k}={w}' for w in v) if isinstance(v, list) else f'{k}={v}'}"
                        for k, v in args.items())
        query = urlunsplit((url.scheme, url.netloc, url.path, args, ""))
        return self._normalize_query(query)

    def _normalize_query(self, query: str) -> str:
        if (self.vapp and not query.startswith("/")
            and not query.startswith("http://") and not query.startswith("https://")):
            query = "/" + query
        return query

    @staticmethod
    def _parse_limit_or_offset(n: Optional[int] = None) -> Optional[int]:
        """
        If the given value is an integer, then returns its value unless it is negative,
        in which case we return None; otherwise if the given value is a string and it can be
        converted to an non-negative integer, then returns its value; otherwise returns None.
        """
        if isinstance(n, str):
            if not n.isdigit():
                return None
            n = int(n)
        elif not isinstance(n, int):
            return None
        return n if n >= 0 else None

    @staticmethod
    def _is_uuid(value: str) -> bool:
        """
        Returns True iff the given value looks like a uuid, otherwise False.
        """
        try:
            uuid.UUID(value)
            return True
        except Exception as e:
            pass
        return False
