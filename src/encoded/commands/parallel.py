import logging
from multiprocessing import cpu_count  # pylint: disable=no-name-in-module
from multiprocessing import Pool  # pylint: disable=no-name-in-module


log = logging.getLogger(__name__)


class ParallelTask(object):
    def __init__(self, task_func, num_cpu=None, no_parallel=False):
        """
        Args:
          - task_func (callable): Task to run on each work item. Must be a
              global function, or instance of a global class, due to
              multiprocessing's limitations.
          - no_parallel (bool): If true, run everything in the main thread.
        """
        self.task_func = task_func
        self.no_parallel = no_parallel
        self.num_cpu = num_cpu or cpu_count() - 1

    def run(self, items, chunk_size=1):
        """Run task in parallel on a list of work items.

        Uses multiprocessing in order to avoid Python's GIL.
        """
        if not self.no_parallel:
            with Pool(self.num_cpu) as pool:
                for res in pool.imap(self.task_func, items, chunk_size):
                    yield res
        else:
            for res in map(self.task_func, items):
                yield res
