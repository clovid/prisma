<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Stripe, Mailgun, Mandrill, and others. This file provides a sane
    | default location for this type of information, allowing packages
    | to have a conventional place to find your various credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
    ],

    'mandrill' => [
        'secret' => env('MANDRILL_SECRET'),
    ],

    'ses' => [
        'key' => env('SES_KEY'),
        'secret' => env('SES_SECRET'),
        'region' => 'us-east-1',
    ],

    'sparkpost' => [
        'secret' => env('SPARKPOST_SECRET'),
    ],

    'stripe' => [
        'model' => App\User::class,
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
    ],

    'akzento' => [
        'base-url' => env('AKZENTO_API_URL'),
        /**
         * 1: Vorklinik Human
         * 2: Vorklinik Zahn
         * 3: Klinik Human
         * 4: Klinik Zahn
         * @var array
         */
        'activated-groups' => [1, 3],
    ],

    'medforge' => [
        'base-url' => env('MEDFORGE_API_URL'),
        'auth-type' => 'oauth',
        'oauth-url' => env('MEDFORGE_OAUTH_TOKEN_URL'),
        'client-id' => env('MEDFORGE_OAUTH_CLIENT_ID'),
        'client-secret' => env('MEDFORGE_OAUTH_CLIENT_SECRET'),
    ],

    'vquest-local' => [
        'base-url' => env('VQUEST_API_URL'),
        'auth-type' => 'token',
        'api-token' => env('VQUEST_API_TOKEN'),
    ],

    'vquest' => [
        'base-url' => env('VQUEST_ONLINE_API_URL'),
        'auth-type' => 'token',
        'api-token' => env('VQUEST_ONLINE_API_TOKEN'),
    ],

    'vquest-online' => [
        'base-url' => env('VQUEST_ONLINE_API_URL'),
        'auth-type' => 'token',
        'api-token' => env('VQUEST_ONLINE_API_TOKEN'),
    ],

    'campus' => [
        'base-url' => env('CAMPUS_API_URL'),
        'auth-type' => 'token',
        'api-token' => env('CAMPUS_API_TOKEN'),
    ],

    'omero' => [
        'domain' => env('OMERO_API_URL'),
        'base-url' => env('OMERO_API_URL') . 'api/v0/',
        'username' => env('OMERO_API_USERNAME'),
        'password' => env('OMERO_API_PASSWORD'),
        'cookies' => true,
        'session-timeout' => 2 * 60 * 60 // 2h in seconds
    ],
];
