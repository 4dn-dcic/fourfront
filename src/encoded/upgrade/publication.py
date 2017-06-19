from snovault import upgrade_step


@upgrade_step('publication', '1', '2')
def publication_1_2(value, system):
    if 'authors' in value:
        try:
            author_list = value['authors'].split(',')
            author_list = [a.strip() for a in author_list]
            value['authors'] = author_list
        except:
            pass
