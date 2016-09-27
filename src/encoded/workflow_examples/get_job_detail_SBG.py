import requests
import json

base_url = "https://api.sbgenomics.com/v2/"

def run_task(token, task_id):
    url = base_url + "tasks/" + task_id

    headers = {'X-SBG-Auth-Token': token,
               'Content-Type': 'application/json'}

    resp = requests.get(url, headers=headers)
    #print(resp.json())
    print(json.dumps(resp.json(),indent=4))

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fun with 7Bridges")
    parser.add_argument('--token', help='your 7Bridges api access token')
    parser.add_argument('--task_id', help='your 7Bridges task ID')
    args = parser.parse_args()
    run_task(args.token, args.task_id)
