## Getting Connection Keys for the 4DN-DCIC servers
An access key and a secret key are required to establish a connection to the 4DN database and to fetch, upload (post), or change (patch) data. Please follow these steps to get your keys.

1. Log in to the 4DN website with your username (email) and password.
    - test server: <https://testportal.4dnucleome.org>
    - production server: <https://data.4dnucleome.org>

    Note that we are using the [Oauth](https://oauth.net/) authentication system which will allow you to login with a google or github login.  _The email associated with the account you use for login must be the same as the one registered with the 4DN-DCIC._

2. Once logged in, go to your ”Profile” page by clicking **Account** on the upper right side of the page.  In your profile page, click the green “Add Access Key” button, and copy the “access key ID” and “secret access key” values from the pop-up page. _Note that once the pop-up page disappears you will not be able to see the secret access key value._ However, if you forget or lose your secret key you can always delete and add new access keys from your profile page at any time.


3. Once you have your access key information, create a file in your home directory named “keypairs.json”. This file will contain your key information in json format and will be read by the Submit4DN scripts to establish a secure connection. The contents of the file must be formatted as shown below - replace key and secret with your new “Access Key ID” and “Secret Access Key”.

**Sample content for keypairs.json**

```json
{
  "default": {
    "key": "ABCDEFG",
    "secret": "abcdefabcd1ab",
    "server": "https://testportal.4dnucleome.org/"
  }
}
```

**Tip:** If you don’t want to use that filename or keep the file in your home directory you can use the --keyfile parameter as an argument to any of the scripts to provide the path to your keypairs file.
If in the file, the key is not called “default” you can use the --key parameter to indicate the stored key name.

    import_data --keyfile Path/name_of_file.json --key NotDefault
