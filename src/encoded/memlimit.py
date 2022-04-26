import humanfriendly
import logging
import psutil


# https://code.google.com/p/modwsgi/wiki/RegisteringCleanupCode


class Generator2:
    def __init__(self, iterable, callback, environ):
        self.__iterable = iterable
        self.__callback = callback
        self.__environ = environ

    def __iter__(self):
        for item in self.__iterable:
            yield item

    def close(self):
        try:
            if hasattr(self.__iterable, 'close'):
                self.__iterable.close()
        finally:
            self.__callback(self.__environ)


class ExecuteOnCompletion2:
    def __init__(self, application, callback):
        self.__application = application
        self.__callback = callback

    def __call__(self, environ, start_response):
        try:
            result = self.__application(environ, start_response)
        except BaseException:
            self.__callback(environ)
            raise
        return Generator2(result, self.__callback, environ)


def rss_checker(rss_limit=None, rss_percent_limit=None):
    """
    Uses a configured rss_limit (absolute amount in bytes) and percentage
    rss_limit to determine whether to kill the running process.
    If the current rss usage is above rss_limit AND the percentage rss usage
    of physical memory is above rss_percent_limit, kill the process
    """
    log = logging.getLogger(__name__)
    process = psutil.Process()

    def callback(environ):
        rss = process.memory_info().rss
        over_rss = rss_limit and rss > rss_limit
        rss_perc = process.memory_percent(memtype="rss")  # XXX: this does not work on Fargate (reports host stats)
        if rss_percent_limit:
            over_perc = rss_perc > rss_percent_limit
        else:
            over_perc = True  # only consider rss if we have no percent set
        if over_rss and over_perc:
            log.error(f"Killing process. Memory usage: {rss}Mb (limit {rss_limit}); Percentage "
                      f"{rss_perc} (limit {rss_percent_limit})")
            process.kill()

    return callback


def filter_app(app, global_conf, rss_limit=None, rss_percent_limit=None):
    if rss_limit is not None:
        rss_limit = humanfriendly.parse_size(rss_limit)
    if rss_percent_limit is not None:
        rss_percent_limit = float(rss_percent_limit)

    callback = rss_checker(rss_limit, rss_percent_limit)
    return ExecuteOnCompletion2(app, callback)
