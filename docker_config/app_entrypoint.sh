#! /bin/sh

# Config cache as we provide cache entries on runtime
php artisan config:cache

# Copy all public files to shared volume to provide for nginx
## Delete all files from webroot
cd /shared/app-webroot && rm -rf ..?* .[!.]* *
## Copy files
cp -R /var/www/prisma/public/. /shared/app-webroot

# Start cron
crond

exec /usr/local/bin/docker-php-entrypoint php-fpm
