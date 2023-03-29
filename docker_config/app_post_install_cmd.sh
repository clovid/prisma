#! /bin/sh

# Clear all compiled classes
php artisan clear-compiled

# Publish vendor config and migrations
php artisan vendor:publish --tag=config
php artisan vendor:publish --tag=migrations
