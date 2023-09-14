FROM public.ecr.aws/docker/library/node:16-alpine AS builder
WORKDIR /usr/app
COPY angular /usr/app/angular
COPY package.json /usr/app/
COPY package-lock.json /usr/app/
COPY gulpfile.js /usr/app/
COPY postcss.config.js /usr/app
RUN npm install && npm run prod

FROM public.ecr.aws/docker/library/php:7.3-fpm-alpine

# Install packages and memcached (as special php-ext)
RUN apk update &&\
	apk upgrade &&\
	apk add --no-cache \
		openssl \
		postgresql-client \
		libmemcached-libs \
		bash &&\
	apk add --virtual .build-dependencies \
		git \
		openssh \
		postgresql-dev \
		libpng-dev \
		cyrus-sasl-dev \
		libmemcached-dev &&\
	docker-php-source extract &&\
	git clone https://github.com/php-memcached-dev/php-memcached.git /usr/src/php/ext/memcached/ &&\
	docker-php-ext-install memcached &&\
	docker-php-source delete

# Install PHP extensions
RUN docker-php-ext-install \
	mbstring \
	bcmath \
	gd \
	pdo \
	pdo_pgsql

# Prepare PHP
COPY docker_config/app_php.ini /usr/local/etc/php/php.ini
RUN touch /var/log/php-errors.log &&\
	chown www-data:www-data /var/log/php-errors.log

# Copy relevant files
COPY database /var/www/prisma/database/
COPY docker_config/app_install_composer.sh composer.lock composer.json /var/www/prisma/

WORKDIR /var/www/prisma

# Install PHP libraries
RUN bash app_install_composer.sh &&\
	rm app_install_composer.sh &&\
	# Do not run scripts as we do this later
	php composer.phar install --no-dev --no-scripts --optimize-autoloader &&\
	rm composer.phar

COPY . /var/www/prisma
COPY --from=builder /usr/app/public /var/www/prisma/public

# Set correct folder permissions
RUN chown -R www-data:www-data \
	storage \
	bootstrap/cache

# Perform post install steps
RUN bash docker_config/app_post_install_cmd.sh

# Configure cronjob
RUN cp docker_config/app_crontab default-cron &&\
	chmod 0644 default-cron &&\
	/usr/bin/crontab -u www-data default-cron

# Clean up
RUN apk del .build-dependencies &&\
	rm -R docker_config

# Prepare laravel config on runtime
ADD docker_config/app_entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
