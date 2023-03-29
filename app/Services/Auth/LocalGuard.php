<?php

namespace App\Services\Auth;

use Illuminate\Contracts\Auth\Guard;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Contracts\Auth\Authenticatable as UserContract;
use Illuminate\Auth\GuardHelpers;
use Illuminate\Support\Str;

use Carbon\Carbon;
use Log;
use Hash;

/**
 * @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
 * @see Illuminate\Auth\TokenGuard
 * @see Illuminate\Auth\SessionGuard
 */
class LocalGuard implements Guard {

  use GuardHelpers, UserTicketHelper;

  protected $ticket;

  /**
   * Create a new authentication guard.
   *
   * @param  \Illuminate\Contracts\Auth\UserProvider  $provider
   * @param  \Illuminate\Http\Request  $request
   * @return void
   */
  public function __construct(UserProvider $provider)
  {
    $this->provider = $provider;
    $this->ticket = $this->getTicketFromRequest();
  }

  /**
   * Get the currently authenticated user.
   *
   * @return \Illuminate\Contracts\Auth\Authenticatable|null
   */
  public function user()
  {
    // If we've already retrieved the user for the current request we can just
    // return it back immediately. We do not want to fetch the user data on
    // every call to this method because that would be tremendously slow.
    if (!is_null($this->user))
      return $this->user;

    $user = null;

    if (!empty($this->ticket) && $this->validateTicket($this->ticket)) {
      // User with this token exists?
      $user = $this->provider->retrieveByToken($this->extractUserId($this->ticket), $this->ticket);

      // TODO: this would be the place to implement an expiration date check.
      // If e.g. the user_ticket was set more than 30 days ago, we set it to null and return null.
    }

    return $this->user = $user;
  }

  /**
   * Attempt to authenticate a user using its credentials.
   *
   * @param  array  $credentials
   * @param  bool   $remember // we do not use this parameter, but we have implement it because of the interface
   * @param  bool   $login // determines if the user ticket is persisted/generated
   * @return bool
   */
  public function attempt(array $credentials = [], $remember = null, $login = true)
  {
    // Check if user exists
    $user = $this->provider->retrieveByCredentials($credentials);
    if (is_null($user))
      return false;

    // Check if credentials are valid
    $valid = $this->provider->validateCredentials($user, $credentials);
    if (!$valid)
      return false;

    if ($login) {
      // Generate random token
      $token = Str::random(60);
      // Add user id to the random token to prevent duplicates
      $this->ticket = $user->id . ':' . $token;

      // Set user ticket
      $this->provider->updateRememberToken($user, $this->ticket);
    }

    // dd($this->ticket);

    return true;
  }

  /**
   * Validate a user's credentials.
   *
   * @param  array  $credentials
   * @return bool
   */
  public function validate(array $credentials = [])
  {
    return $this->attempt($credentials, false, false);
  }

  /**
   * Log the user out of the application.
   *
   * @return void
   */
  public function logout()
  {
    $user = $this->user();

    if (is_null($user))
      // No user is logged in
      return;

    $this->provider->updateRememberToken($user, null);
    $this->user = null;
  }

  /**
   * Checks if the ticket contains an ':'
   * as the local user tickets contain user_id:token
   * @param  string $ticket
   * @return bool
   */
  protected function validateTicket($ticket)
  {
    return strpos($ticket, ':') !== false;
  }

  /**
   * Extracts the user id from a local user ticket
   * @param  string $ticket
   * @return int|null
   */
  protected function extractUserId($ticket)
  {
    $values = explode(':', $ticket);
    return empty($values) || !is_numeric($values[0]) ? null : $values[0];
  }
}