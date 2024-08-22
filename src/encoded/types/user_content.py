"""Abstract collection for UserContent and sub-classes of StaticSection, HiglassViewConfig, etc."""

from urllib.parse import urlparse
from uuid import uuid4
from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema
)
from docutils.core import publish_parts
from bs4 import BeautifulSoup
import markdown
import re
from snovault.interfaces import STORAGE
from .base import (
    Item,
    ALLOW_CURRENT_ACL,
    DELETED_ACL,
    ALLOW_LAB_SUBMITTER_EDIT_ACL,
    ALLOW_VIEWING_GROUP_VIEW_ACL,
    ONLY_ADMIN_VIEW_ACL,
    ALLOW_OWNER_EDIT_ACL,
    ALLOW_ANY_USER_ADD_ACL,
    lab_award_attribution_embed_list
)
import os
import re
import requests

@abstract_collection(
    name='user-contents',
    unique_key='user_content:name',
    properties={
        'title': "User Content Listing",
        'description': 'Listing of all types of content which may be created by people.',
    })
class UserContent(Item):
    item_type = 'user_content'
    base_types = ['UserContent'] + Item.base_types
    schema = load_schema('encoded:schemas/user_content.json')
    embedded_list = lab_award_attribution_embed_list
    # the following fields are patched by the update method and should always be included in the invalidation diff
    default_diff = ['name']

    STATUS_ACL = {              # Defaults + allow owner to edit (in case owner has no labs or submit_for)
        'released'              : ALLOW_OWNER_EDIT_ACL + ALLOW_CURRENT_ACL,
        'deleted'               : ALLOW_OWNER_EDIT_ACL + DELETED_ACL,
        'draft'                 : ALLOW_OWNER_EDIT_ACL + ONLY_ADMIN_VIEW_ACL,
        'released to lab'       : ALLOW_OWNER_EDIT_ACL + ALLOW_LAB_SUBMITTER_EDIT_ACL,
        'released to project'   : ALLOW_OWNER_EDIT_ACL + ALLOW_VIEWING_GROUP_VIEW_ACL,
        # 'archived'              : ALLOW_OWNER_EDIT_ACL + ALLOW_CURRENT_ACL,
        # 'archived to project'   : ALLOW_OWNER_EDIT_ACL + ALLOW_VIEWING_GROUP_VIEW_ACL
    }

    @calculated_property(schema={
        "title": "Content",
        "description": "Content (unused)",
        "type": "string"
    })
    def content(self, request):
        return None

    @calculated_property(schema={
        "title": "File Type",
        "description": "Type of this Item (unused)",
        "type": "string"
    })
    def filetype(self, request):
        return None

    def _update(self, properties, sheets=None):
        if properties.get('name') is None and self.uuid is not None:
            properties['name'] = str(self.uuid)
        super(UserContent, self)._update(properties, sheets)

    @classmethod
    def create(cls, registry, uuid, properties, sheets=None):
        submitted_by_uuid   = properties.get('submitted_by')
        lab_schema          = cls.schema and cls.schema.get('properties', {}).get('lab')
        award_schema        = cls.schema and cls.schema.get('properties', {}).get('award')
        if (
            not submitted_by_uuid                               # Shouldn't happen
            or (not lab_schema and not award_schema)            # If not applicable for Item type (shouldn't happen as props defined on UserContent schema)
            or ('lab' in properties or 'award' in properties)   # If values exist already - ideal case - occurs for general submission process(es)
        ):
            # Default for all other Items
            return super(UserContent, cls).create(registry, uuid, properties, sheets)

        submitted_by_item = registry[STORAGE].get_by_uuid(submitted_by_uuid)

        if submitted_by_item:
            # All linkTo property values, if present, are UUIDs
            if 'lab' not in properties and 'lab' in submitted_by_item.properties:
                # Use lab of submitter - N.B. this differs from other Items where lab comes from 'submits_for' list.
                properties['lab'] = submitted_by_item.properties['lab']

            if 'award' not in properties and 'lab' in submitted_by_item.properties:
                lab_item = registry[STORAGE].get_by_uuid(submitted_by_item.properties['lab'])
                if lab_item and len(lab_item.properties.get('awards', [])) > 0:
                    # Using first award as default/fallback when award not explicitly selected/sent.
                    properties['award'] = lab_item.properties['awards'][0]

        return super(UserContent, cls).create(registry, uuid, properties, sheets)



@collection(
    name='static-sections',
    unique_key='user_content:name',
    properties={
        'title': 'Static Sections',
        'description': 'Static Sections for the Portal',
    })
class StaticSection(UserContent):
    """The Software class that contains the software... used."""
    item_type = 'static_section'
    schema = load_schema('encoded:schemas/static_section.json')

    @calculated_property(schema={
        "title": "Content",
        "description": "Content for the page",
        "type": "string"
    })
    def content(self, request, body=None, file=None):

        if isinstance(body, str) or isinstance(body, dict) or isinstance(body, list):
            # Don't need to load in anything. We don't currently support dict/json body (via schema) but could in future.
            return body

        if isinstance(file, str):
            if file[0:4] == 'http' and '://' in file[4:8]:  # Remote File
                return get_remote_file_contents(file)
            else:                                           # Local File
                file_path = os.path.abspath(os.path.dirname(os.path.realpath(__file__)) + "/../../.." + file)   # Go to top of repo, append file
                return get_local_file_contents(file_path)

        return None

    @calculated_property(schema={
        "title": "Content as HTML",
        "description": "Convert RST, HTML and MD content into HTML",
        "type": "string"
    })
    def content_as_html(self, request, body=None, file=None, options=None):
        content = self.content(request, body, file)
        if not content:
            return None

        file_type = self.filetype(request, body, file, options)
        convert_links = request and request.domain and options and options.get('convert_ext_links', True)

        if file_type == 'rst':
            # html header: range <h1> to <h6>, default <h2>
            initial_header_level = options.get('initial_header_level', 2) if options is not None else 2
            settings_overrides = {
                'doctitle_xform': False,
                'initial_header_level': initial_header_level
            }
            parts = publish_parts(content, writer_name='html', settings_overrides=settings_overrides)
            rst_html = parts["html_body"]
            # post-process generated html to match portal requirements
            return post_process_rst_html(rst_html, convert_links, request.domain)
        elif file_type == 'md':
            # convert markdown to html including tables
            md_html = markdown.markdown(content, extensions=['tables', 'fenced_code'])
            # post-process generated html to match portal requirements
            return post_process_markdown_html(md_html, convert_links, request.domain)
        elif file_type == 'jsx' or file_type == 'html':
            return post_process_plain_html(content, convert_links, request.domain, file_type)

        return None

    @calculated_property(schema={
        "title": "File Type",
        "description": "Type of file used for content",
        "type": "string"
    })
    def filetype(self, request, body=None, file=None, options=None):
        if options and options.get('filetype') is not None:
            return options['filetype']
        if isinstance(body, str):
            return 'txt'
        if isinstance(body, dict) or isinstance(body, list):
            return 'json'
        if isinstance(file, str):
            filename_parts = file.split('.')
            if len(filename_parts) > 1:
                return filename_parts[len(filename_parts) - 1]
            else:
                return 'txt' # Default if no file extension.
        return None




@collection(
    name='higlass-view-configs',
    unique_key='user_content:name',
    properties={
        'title': 'HiGlass Displays',
        'description': 'Displays and view configurations for HiGlass',
    })
class HiglassViewConfig(UserContent):
    """
    Item type which contains a `view_config` property and other metadata.
    """

    item_type = 'higlass_view_config'
    schema = load_schema('encoded:schemas/higlass_view_config.json')

    #@calculated_property(schema={
    #    "title": "ViewConfig Files",
    #    "description": "List of files which are defined in ViewConfig",
    #    "type": "array",
    #    "linkTo" : "File"
    #})
    #def viewconfig_files(self, request):
    #    '''
    #    TODO: Calculate which files are defined in viewconfig, if any.
    #    '''
    #    return None


    #@calculated_property(schema={
    #    "title": "ViewConfig Tileset UIDs",
    #    "description": "List of UIDs which are defined in ViewConfig",
    #    "type": "array",
    #    "items" : {
    #        "type" : "string"
    #    }
    #})
    #def viewconfig_tileset_uids(self, request):
    #    '''
    #    TODO: Calculate which tilesetUids are defined in viewconfig, if any.
    #    '''
    #    return None

    @calculated_property(schema={
        "title": "File Type",
        "description": "Type of this Item (unused)",
        "type": "string"
    })
    def filetype(self, request):
        return "HiglassViewConfig"

    class Collection(Item.Collection):
        '''
        This extension of the default Item collection allows any User to create a new version of these.
        Emulates base.py Item collection setting of self.__acl__

        TODO:
            Eventually we can move this up to UserContent or replicate it on JupyterNotebook if want any
            User to be able to create new one.
        '''
        def __init__(self, *args, **kw):
            super(HiglassViewConfig.Collection, self).__init__(*args, **kw)
            self.__acl__ = ALLOW_ANY_USER_ADD_ACL


@collection(
    name='microscope-configurations',
    properties={
        'title': 'Microscope Configurations',
        'description': 'Collection of Metadata for microscope configurations of various Tiers',
    })
class MicroscopeConfiguration(UserContent):
    """The MicroscopeConfiguration class that holds configuration of a microscope."""

    item_type = 'microscope_configuration'
    schema = load_schema('encoded:schemas/microscope_configuration.json')
    # the following fields are patched by the update method and should always be included in the invalidation diff
    default_diff = ['description']

    STATUS_ACL = {
        'released'              : ALLOW_CURRENT_ACL,
        'deleted'               : DELETED_ACL,
        'draft'                 : ALLOW_OWNER_EDIT_ACL + ALLOW_LAB_SUBMITTER_EDIT_ACL,
        'released to project'   : ALLOW_VIEWING_GROUP_VIEW_ACL
    }

    def _update(self, properties, sheets=None):
        if properties.get('microscope'):
            microscope = properties.get('microscope')
            # set microscope ID if empty
            if not microscope.get('ID'):
                microscope['ID'] = str(uuid4())
            # always sync item's description to microscope's description
            microscopeDesc = microscope.get('Description', '')
            properties['description'] = microscopeDesc
        super(MicroscopeConfiguration, self)._update(properties, sheets)

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, microscope, title=None):
        return title or microscope.get("Name")

    class Collection(Item.Collection):
        '''
        This extension of the default Item collection allows any User to create a new version of these.
        Emulates base.py Item collection setting of self.__acl__
        '''
        def __init__(self, *args, **kw):
            super(MicroscopeConfiguration.Collection, self).__init__(*args, **kw)
            self.__acl__ = ALLOW_ANY_USER_ADD_ACL


@collection(
    name='image-settings',
    properties={
        'title': 'Image Settings',
        'description': 'Listing of ImageSetting Items.',
    })
class ImageSetting(UserContent):
    """Image Settings class."""

    item_type = 'image_setting'
    schema = load_schema('encoded:schemas/image_setting.json')
    STATUS_ACL = {
        'released'              : ALLOW_CURRENT_ACL,
        'deleted'               : DELETED_ACL,
        'draft'                 : ALLOW_OWNER_EDIT_ACL + ALLOW_LAB_SUBMITTER_EDIT_ACL,
        'released to project'   : ALLOW_VIEWING_GROUP_VIEW_ACL
    }

    class Collection(Item.Collection):
        '''
        This extension of the default Item collection allows any User to create a new version of these.
        Emulates base.py Item collection setting of self.__acl__
        '''
        def __init__(self, *args, **kw):
            super(ImageSetting.Collection, self).__init__(*args, **kw)
            self.__acl__ = ALLOW_ANY_USER_ADD_ACL


def get_local_file_contents(filename, contentFilesLocation=None):
    if contentFilesLocation is None:
        full_file_path = filename
    else:
        full_file_path = contentFilesLocation + '/' + filename
    if not os.path.isfile(full_file_path):
        return None
    file = open(full_file_path, encoding="utf-8")
    output = file.read()
    file.close()
    return output


def get_remote_file_contents(uri):
    resp = requests.get(uri)
    return resp.text


def post_process_markdown_html(markdown_html, convert_links, ref_domain, custom_wrapper = 'div'):
    # default
    output = f'<{custom_wrapper} class="markdown-container">{markdown_html}</{custom_wrapper}>'

     # Parse the HTML content with BeautifulSoup
    soup = BeautifulSoup(output, 'html.parser')

    # Find all <pre><code>XYZ</code></pre> patterns and convert to <pre>XYZ</pre>
    for code_tag in soup.find_all('code'):
        # Find the nearest parent <pre> tag
        pre_tag = code_tag.find_parent('pre')
    
        if pre_tag:
            # Append the content of the <code> tag to the <pre> tag
            pre_tag.append(code_tag.string)      
            # Remove the <code> tag
            code_tag.decompose()

    if convert_links:
        convert_soup_links(soup, ref_domain)

    output = str(soup)

    return output


def post_process_rst_html(rst_html, convert_links, ref_domain):
    # Parse the HTML content with BeautifulSoup
    soup = BeautifulSoup(rst_html, 'html.parser')

    # rename default wrapper class
    document_div = soup.find('div', class_='document')
    if document_div:
        document_div['class'] = ['rst-container']

    # Find all div elements with class="section" and unwrap them
    section_divs = soup.find_all('div', class_='section')
    for section_div in section_divs:
        section_div.unwrap()

    # Find all <tt> tags and convert to <code>
    tt_tags = soup.find_all('tt')
    for tt_tag in tt_tags:
        code_tag = soup.new_tag('code')
        if tt_tag.string:
            code_tag.string = tt_tag.string
        tt_tag.replace_with(code_tag)

    if convert_links:
        convert_soup_links(soup, ref_domain)

    output = str(soup)
    
    # Find all <pre> tags with their attributes and content
    pre_matches = re.findall(r'<pre.*?>(.*?)</pre>', output, re.DOTALL)

    # Replace '\n' outside of <pre> tags with an empty string
    output = re.sub(r'(<pre.*?>.*?</pre>)|(\n)', lambda match: match.group(1) or '', output, flags=re.DOTALL)

    # Restore the original content within <pre> tags
    for pre_match in pre_matches:
        output = output.replace(f'<pre>{pre_match}</pre>', f'<pre>{pre_match}</pre>')

    return output

def post_process_plain_html(plain_html, convert_links, ref_domain, file_type = 'html'):
    # shortcut for jsx, lacks external link conversion
    if file_type == 'jsx':
        return '<div class="html-container">' + plain_html + '</div>'
    
    # Parse the content with BeautifulSoup
    soup = BeautifulSoup(plain_html, 'html.parser')

    # Check if the outermost element is a div
    if soup.contents and soup.contents[0].name == 'div':
        # If the outermost element is a div, add the "html-container" class
        root_div = soup.contents[0]
        root_div['class'] = root_div.get('class', []) + ['html-container']
    else:
        # If there is no outer div, create a new wrapping div with "html-container" class
        new_wrapper = soup.new_tag("div", **{"class": "html-container"})
    
        # Add all content to the new div
        new_wrapper.extend(soup.contents)
    
        # Clear the existing content and add the new wrapper
        soup.clear()
        soup.append(new_wrapper)

    if convert_links:
        convert_soup_links(soup, ref_domain)

    # Convert the soup object to a string
    output = str(soup)
    
    return output


def convert_html_links(html, reference_domain):
    """
    Seeks hyperlinks within string content and adds 'target="_blank"' and 'rel="noopener noreferrer"' attributes for external links.
    """
    # Parse the HTML content with BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    convert_soup_links(soup, reference_domain)

    return str(soup)

def convert_soup_links(soup, reference_domain):
    """
    Seeks hyperlinks within string content and adds 'target="_blank"' and 'rel="noopener noreferrer"' attributes for external links.
    """
    # Normalize the reference domain to lowercase
    reference_domain_lower = reference_domain.casefold()

    # Find all <a> tags
    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        parsed_url = urlparse(href)

        # Check if the link is an external link
        if parsed_url.netloc and reference_domain_lower not in parsed_url.netloc.casefold():
            # Add target="_blank" and rel="noopener noreferrer" attributes
            a_tag['target'] = '_blank'
            a_tag['rel'] = 'noopener noreferrer'