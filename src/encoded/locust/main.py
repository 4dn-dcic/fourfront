import os
import argparse
import subprocess

def main():
    """
    Entry point for locust load testing. Run with -h to see arguments
    """
    parser = argparse.ArgumentParser(
        description='Locust Load Testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('config', help='path to config.json')
    parser.add_argument('key', help='path to <env>.json')
    parser.add_argument('--time', help='time to run test for, default 1m. Format: 10s, 5m, 1h, 1h30m etc.', type=str, default='1m')
    parser.add_argument('--nclients', help='number of clients, default 10', type=int, default=10)
    parser.add_argument('--rate', help='number of clients to hatch per second, default 10', type=int, default=10)
    parser.add_argument('--lower', help='lower bound on time to wait between requests, default 1', type=int, default=1)
    parser.add_argument('--upper', help='upper bound on time to wait between requests, default 2', type=int, default=2)
  
    args = parser.parse_args()

    # set env variables (this is the only way to do this) and configure args
    locust_env = os.environ.copy()
    locust_env['LOCUST_CONFIG'] = args.config
    locust_env['LOCUST_KEY'] = args.key
    locust_env['LOCUST_ENV'] = os.path.splitext(os.path.basename(args.key))[0]  # /path/to/data.json -> data
    locust_env['LOCUST_LOWER_BOUND'] = str(args.lower)
    locust_env['LOCUST_UPPER_BOUND'] = str(args.upper)
    clients = str(args.nclients)
    rate = str(args.rate)
    time = args.time

    # invoke locust
    subprocess.call(['locust', '-f', 'ff_locust.py', '--no-web', '-c', clients, '-r', rate,
                      '--run-time', time, '--print-stats'], env=locust_env)


if __name__ == '__main__':
    main()