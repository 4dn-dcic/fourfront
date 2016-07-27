@page @usefixtures(workbook,admin_user)
Feature: Portal pages

    Scenario: Render page layout
        When I visit "/"
        And I wait for the content to load
        Then I should see 3 elements with the css selector ".col-md-12"
        And I should see an element with the css selector ".home-title"
        And I should see an element with the css selector ".home-announcements"
        And I should see an element with the css selector ".home-getting-started"

    Scenario: Override column class
        When I visit "/test-section/"
        And I wait for the content to load
        Then I should see an element with the css selector ".class_override"

    Scenario: Add a page
        When I visit "/pages/"
        And I wait for the table to fully load
        And I press "Add"
        And I wait for the form to fully load
        And I fill in "name" with "test"
        And I fill in "title" with "Test"
        And I press "Save"
        And I wait for the content to load
        Then the browser's URL should contain "/test/"
        And the title should contain the text "Test"
