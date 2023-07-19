# utility functions

import contextlib
import io
import json
import os
import pkg_resources
import re
import structlog
import tempfile
from typing import Any, Generator, Optional
from dcicutils.misc_utils import exported, find_association, url_path_join
from snovault.util import (
    beanstalk_env_from_registry,
    check_user_is_logged_in,
    content_type_allowed,
    create_empty_s3_file,
    customized_delay_rerun,
    debuglog,
    delay_rerun,
    get_trusted_email,
    make_vapp_for_ingestion,
    #resolve_file_path as snovault_resolve_file_path,
    s3_local_file,
    s3_output_stream,
)
exported (
    beanstalk_env_from_registry,
    check_user_is_logged_in,
    content_type_allowed,
    create_empty_s3_file,
    customized_delay_rerun,
    debuglog,
    delay_rerun,
    get_trusted_email,
    make_vapp_for_ingestion,
    s3_local_file,
    s3_output_stream
)

log = structlog.getLogger(__name__)
ENCODED_ROOT_DIR = os.path.dirname(__file__)


#def resolve_file_path(path, file_loc=None):
#    return snovault_resolve_file_path(path=path, file_loc=file_loc, root_dir=ENCODED_ROOT_DIR)


@contextlib.contextmanager
def temporary_file(*, extension: Optional[str] = None) -> Generator[Any, None, None]:
    """
    Context manager allowing something like this:
        with temporary_file(extension=".json") as filename:
            with io.open(filename, "w") as fp:
                put_something_in_the_temporary_file(fp)
            with io.open(filename, "r") as fp:
                process_the_temporary_file(fp)
    :param extension: Optional filename extension (with the dot prefix if desired, e.g. ".json").
    """
    temporary_filename = tempfile.mktemp() + (extension if extension else "")
    try:
        yield temporary_filename
    finally:
        try:
            os.remove(temporary_filename)
        except Exception:
            pass


# IMPLEMENTATION NOTE:
#
#    We have middleware that overrides various details about content type that are declared in the view_config.
#    It used to work by having a wired set of exceptions, but this facility allows us to do it in a more data-driven
#    way. Really I think we should just rely on the information in the view_config, but I didn't have time to explore
#    why we are not using that.
#
#    See validate_request_tween_factory in renderers.py for where this is used. This declaration info is here
#    rather than there to simplify the load order dependencies.
#
#    -kmp 1-Sep-2020

JSON_CONTENT_HEADERS = {'Content-Type': 'application/json', 'Accept': 'application/json'}


@contextlib.contextmanager
def posted_temporary_page(testapp, base_url, content):
    [val] = testapp.post_json(base_url, content, status=(201, 301)).maybe_follow().json['@graph']
    uuid = val.get('uuid')
    yield val
    if uuid:
        # Note: Without JSON headers, this will get a 415 even if it's not using the result data. -kmp 23-Feb-2021
        testapp.delete(url_path_join('/', uuid), headers=JSON_CONTENT_HEADERS)


def workbook_lookup(item_type, **attributes):
    return any_inserts_lookup('workbook-inserts', item_type=item_type, **attributes)


def any_inserts_lookup(inserts_directory_name, item_type, **attributes):
    item_filename = pkg_resources.resource_filename('encoded', 'tests/data/' + inserts_directory_name
                                                    + "/" + item_type.lower() + ".json")
    with io.open(item_filename) as fp:
        data = json.load(fp)
        return find_association(data, **attributes)


# for more information, visit http://detectmobilebrowsers.com/
_IS_MOBILE_BROWSER_MATCH_B = re.compile(r"(android|bb\\d+|meego).+mobile|avantgo|bada\\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\\.(browser|link)|vodafone|wap|windows ce|xda|xiino", re.I | re.M)
_IS_MOBILE_BROWSER_MATCH_V = re.compile(r"1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\\-(n|u)|c55\\/|capi|ccwa|cdm\\-|cell|chtm|cldc|cmd\\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\\-s|devi|dica|dmob|do(c|p)o|ds(12|\\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\\-|_)|g1 u|g560|gene|gf\\-5|g\\-mo|go(\\.w|od)|gr(ad|un)|haie|hcit|hd\\-(m|p|t)|hei\\-|hi(pt|ta)|hp( i|ip)|hs\\-c|ht(c(\\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\\-(20|go|ma)|i230|iac( |\\-|\\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\\/)|klon|kpt |kwc\\-|kyo(c|k)|le(no|xi)|lg( g|\\/(k|l|u)|50|54|\\-[a-w])|libw|lynx|m1\\-w|m3ga|m50\\/|ma(te|ui|xo)|mc(01|21|ca)|m\\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\\-2|po(ck|rt|se)|prox|psio|pt\\-g|qa\\-a|qc(07|12|21|32|60|\\-[2-7]|i\\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\\-|oo|p\\-)|sdk\\/|se(c(\\-|0|1)|47|mc|nd|ri)|sgh\\-|shar|sie(\\-|m)|sk\\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\\-|v\\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\\-|tdg\\-|tel(i|m)|tim\\-|t\\-mo|to(pl|sh)|ts(70|m\\-|m3|m5)|tx\\-9|up(\\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\\-|your|zeto|zte\\-", re.I | re.M)

def is_mobile_browser(request):
    if hasattr(request, 'user_agent') and request.user_agent is not None:
        user_agent = request.user_agent
        b = _IS_MOBILE_BROWSER_MATCH_B.search(user_agent)
        v = _IS_MOBILE_BROWSER_MATCH_V.search(user_agent[0:4])
        if b or v:
            return True      
    # fallback
    return False
