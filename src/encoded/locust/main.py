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
    parser.add_argument('--time', help='time to run test for, default 1m. Format: 10s, 5m, 1h, 1h30m etc.')
    parser.add_argument('--clients', help='number of clients, default 10')
    parser.add_argument('--rate', help='number of clients to hatch per second, default 10')
    parser.add_argument('--lower', help='lower bound on time to wait between requests, default 1')
    parser.add_argument('--upper', help='upper bound on time to wait between requests, default 2')
  
    args = parser.parse_args()

    # set env variables (this is the only way to do this) and configure args
    env_copy = os.environ.copy()
    env_copy['LOCUST_CONFIG'] = args.config
    env_copy['LOCUST_KEY'] = args.key
    env_copy['LOCUST_ENV'] = args.key.split('.')[0]  # data.json -> data
    env_copy['LOCUST_LOWER_BOUND'] = args.lower or '1'
    env_copy['LOCUST_UPPER_BOUND'] = args.upper or '2'
    clients = args.clients or '10'
    rate = args.rate or '10'
    time = args.time or '1m'

    # invoke locust
    subprocess.call(['locust', '-f', 'ff_locust.py', '--no-web', '-c', clients, '-r', rate,
                      '--run-time', time, '--print-stats'], env=env_copy)


if __name__ == '__main__':
    main()