import requests
import json

base_url = "https://api.sbgenomics.com/v2/"

def run_task(token, app_id):
    url = base_url + "apps/" + app_id

    headers = {'X-SBG-Auth-Token': token,
               'Content-Type': 'application/json'}

    resp = requests.get(url, headers=headers)
    #print(resp.json())
    print(json.dumps(resp.json(),indent=4))

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fun with 7Bridges")
    parser.add_argument('--token', help='your 7Bridges api access token')
    parser.add_argument('--app_id', help='your 7Bridges App ID - "owner/project/appname/revision"')
    args = parser.parse_args()
    run_task(args.token, args.app_id)
