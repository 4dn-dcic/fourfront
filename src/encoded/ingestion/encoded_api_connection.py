from collections.abc import Generator
from typing import Callable, Optional, Union
from urllib.parse import parse_qs, urlencode, urlparse, urlunsplit
import uuid
from dcicutils.ff_utils import get_metadata, search_metadata
from dcicutils.misc_utils import VirtualApp

# EncodedAPIConnection encapsulates some basic ontology related queries.
# Works via either (HTTP) connection to the portal via ff_utils, or with a VirtualApp
# which will call directly back into this process. The former is (typically) used when
# called via command-line (e.g. generate-ontology); the latter (typically) when called
# from the ingester process (i.e. ingestion_listener) itself.
#
# WRT naming convension for methods in this class, methods begining with "search_"
# indicate that a search result is being returned, and those beginning with "get_"
# indicate that a single specific result is being returned; and methods ending
# in "_set" indicate that a generator (which can be iterated on) is being returned.
#
# N.B. Not actually substantively used yet, except for in commands.generate_ontology.
# Orginally WAS going to generate ontology on the fly from the ingestion service, but
# now NOT doing that because the ontology file generation process still as yet requires
# manual steps to get a proper ontology file; so submit-ontology in SubmitCGAP (sic) will
# require specification of this such a manually generated (mostly via generate-ontology
# script) ontology file. Ideally, aspirationally, we'd like to eventually be able to do
# generate the ontology on the fly as part of ontology ingestion process.

class EncodedAPIConnection:

    # The maximum number of records to retrieve at a time via search_result_set.
    _MAX_RESULTS_PER_PAGE = 4000

    def __init__(self, connection_or_vapp: Union[dict, VirtualApp]) -> None:
        if isinstance(connection_or_vapp, dict):
            self.connection = connection_or_vapp
            self.vapp = None
        elif isinstance(connection_or_vapp, VirtualApp):
            self.connection = None
            self.vapp = connection_or_vapp
        else:
            raise Exception("Error creating EncodedAPIConnection")

    def search_ontologies_set(self,
                              limit: Optional[int] = None,
                              ignore: Optional[Callable] = None) -> Generator:
        """
        Returns a generator for paging through all available ontologies.
        N.B. The limit argument is really only for testing/troublshooting to limits
        the TOTAL number of results returned; not related to the limit variable
        used internally in this module to limit results per page for paging.
        """
        return self.search_result_set("search/?type=Ontology", limit, ignore)

    def search_ontologies(self,
                          limit: Optional[int] = None,
                          ignore: Optional[Callable] = None) -> list:
        """
        Same as search_ontologies_set but executes the returned generator and returns as a list.
        """
        return list(self.search_ontologies_set(limit=limit, ignore=ignore))

    def get_ontology(self, ontology_uuid: str) -> Optional[dict]:
        """
        Returns the ontology (dictionary) for the given uuid or None if not found.
        """
        query = self._normalize_query(f"ontologys/{ontology_uuid}/")
        return self.get_result(query)

    def search_ontology_terms_set(self,
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
            return self.search_result_set(f"search/?type=OntologyTerm&is_slim_for={category}", limit, ignore)
        else:
            # TODO: What exactly do status=released and status=obsolete do?
            return self.search_result_set(f"search/?type=OntologyTerm&status=released&status=obsolete", limit, ignore)

    def search_ontology_terms(self,
                              category: Optional[str] = None,
                              limit: Optional[int] = None,
                              ignore: Optional[Callable] = None) -> list:
        """
        Same as search_ontology_terms_set but executes the returned generator and returns as a list.
        N.B. The limit argument is really only for testing/troublshooting to limits
        the TOTAL number of results returned; not related to the limit variable
        used internally in this module to limit results per page for paging.
        """
        return list(self.search_ontology_terms_set(category=category, limit=limit, ignore=ignore))

    def search_ontology_terms_as_dict(self,
                                      limit: Optional[int] = None,
                                      ignore: Optional[Callable] = None) -> dict:
        """
        Same as search_ontology_terms but returns that list as a dictionary indexed by name (term_id).
        """
        terms = self.search_ontology_terms(limit=limit, ignore=ignore)
        return {term["term_id"]: term for term in terms}

    def get_ontology_term(self, ontology_term_uuid: str) -> Optional[dict]:
        """
        Returns the ontology term (dictionary) for the given uuid or None if not found.
        """
        return self.get_result(f"search/?type=OntologyTerm&uuid={ontology_term_uuid}")

    def search_ontology_slim_terms(self, limit: Optional[int] = None) -> list:
        """
        """
        slim_categories = ['developmental', 'assay', 'organ', 'system', 'cell']
        slim_terms = []
        for category in slim_categories:
            try:
                terms = self.search_ontology_terms_set(category=category, limit=limit)
                slim_terms.extend(terms)
            except TypeError:
                pass
        return slim_terms

    def get_ontology_term_links(self, ontology_term_uuid: str) -> Optional[dict]:
        """
        Returns the ontology term links (dictionary) for the given uuid or None if not found.
        """
        return self.get_result(f"ontology-terms/{ontology_term_uuid}/@@links")

    def search_result_set(self, query: str,
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
            query = self._create_search_result_set_query(query, limit, offset)
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
            if isinstance(response, list):
                # This can happen from tests (e.g. tests/test_generate_ontology),
                # where we mock search_metadata to just return a static list.
                break
            if offset == offset_before_iteration:
                # No results in this result set (page); we are done.
                break

    def search_results(self, query: str,
                       limit: Optional[int] = None,
                       ignore: Optional[Callable] = None) -> list:
        """
        Same as search_result_set but executes the returned generator and returns as a list.
        N.B. The limit argument is really only for testing/troublshooting to limits
        the TOTAL number of results returned; not related to the limit variable
        used internally in this module to limit results per page for paging.
        """
        return list(self.search_result_set(query, limit, ignore))

    def get_result(self, query: str) -> Optional[Union[dict]]:
        """
        Returns a single result for the given query or None if no result.
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

    def _create_search_result_set_query(self,
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
