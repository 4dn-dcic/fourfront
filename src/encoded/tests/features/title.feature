@title
Feature: Title

    Scenario: Title updates
        When I visit "/"
        And I wait for the content to load
        Then the title should contain the text "4D Nucleome"
        When I click the link with text that contains "Data"
        And I click the link to "/search/?type=Experiment"
        And I wait for the content to load
        Then the title should contain the text "Search – 4D Nucleome"
