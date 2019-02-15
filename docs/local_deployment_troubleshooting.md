---

**NOTE**

If you had problems with your local deployment, and found solutions to them, please document them here.
Please include software versions, and date

---

### 20190218 Pillow 3.1.1 install error on Mac 10.14.3, Xcode 10.1 (command line tools 10.1 10B61) - Koray
I switched to Mojave, decided to do a fresh install of ff,  and updated Xcode from appstore, run `xcode-select --install` to update (you might need to restart computer after installing xcode, run xcode, and agree to the terms).
It turns out the new (Mojave) Xcode Command Line tools no longer installs needed headers in /include.
This did the trick for me

`sudo installer -pkg /Library/Developer/CommandLineTools/Packages/macOS_SDK_headers_for_macOS_10.14.pkg -target /`

for more info
https://github.com/pyenv/pyenv/issues/1219


###