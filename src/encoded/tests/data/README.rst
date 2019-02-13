Do not load ANY inserts automatically with load_data on webprod/webprod2
Make it so you can run with --prod flag to do so on the server

Come up with a strategy for keeping master-inserts up-to-date

Directories:
    - inserts – local, mastertest. Soo will keep workflow/software/etc. inserts up-to-date manually
    - master-inserts – all environments, but not automatically on webprod/webprod2. used in test_loadxl
    - ontology-inserts – never loaded
    - perf-testing – used for some tests that are currently disabled + not working. Run with pytest -m "performance"
    - workbook-inserts – used by travis for unit tests
