Feature: Connectors and hosted method availability
  As a tenant administrator
  I want connector settings to control hosted auth and native endpoint access
  So that unavailable identity methods cannot be used accidentally

  Background:
    Given a first admin exists
    And I am signed in to Console

  @journey:connectors-email
  Scenario: Email connector drawer controls hosted email-code availability
    When I change the Email connector settings
    Then hosted Email code sign-in follows the saved settings

  @journey:sign-in-method-availability
  Scenario: Hosted sign-in empty-state logic respects enabled methods
    Given only selected built-in methods are enabled
    When I open hosted sign-in
    Then unavailable methods are hidden
    And no empty-method warning is shown while a usable method remains

  @journey:phone-sign-in
  Scenario: Phone sign-in availability follows SMS connector settings
    Given phone sign-in is controlled by the SMS connector
    When the SMS connector is enabled or disabled
    Then hosted phone sign-in and native endpoint access follow that setting

  @journey:hosted-preview-consistency
  Scenario: Hosted auth preview matches the real hosted card
    When I update hosted method availability in Console
    Then the live preview and /sign-in show the same methods

  @journey:onetap-flow
  Scenario: Google One Tap availability is connector-controlled
    Given Google One Tap is configured through a connector
    When I toggle connector availability
    Then hosted auth shows or hides One Tap accordingly

  @journey:social-login
  Scenario: Social login availability follows connector settings
    Given a social connector exists
    When the connector is available or unavailable
    Then hosted auth and native social endpoints enforce that state

  @journey:provider-disabled-endpoint-enforcement
  Scenario: Disabled hosted auth providers block native auth endpoints
    Given hosted auth providers are disabled by policy
    When I call their native auth endpoints directly
    Then the endpoints reject the request
