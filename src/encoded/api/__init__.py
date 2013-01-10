routes = {
    '': 'home',
    'antibodies/': 'antibodies',
    'antibodies/{antibody}': 'antibody',
    }


def includeme(config):
    for pattern, name in routes.items():
        config.add_route(name, pattern)
    config.scan('.views')
