# PRISMA - Performance | Recording | Integration | Substraction | Mentoring | Awareness

PRISMA is a learning dashboard that supports group discussions by showing the anonymized results of the individual answers given for questions in a task. The answers will be aggregated depending on the question type. E.g. for multiple choice question a frequency distribution is shown or for maker questions (where students need to mark a region of interest in an image) all markers are shown in one image.

The answers that are aggregated and displayed are comming from *modules*. A *module* is a connector to a software system that provides (a) the student answers **and** the (b) the context information. The context information contains the *task* containing the *questions* and additional information about the *questions* (e.g. what possibilities are correct).

Currently we support the following *modules*
- MedForGe
- CAMPUS (not used anymore)
- VQuest (deprecated)
- VQuest online

Other modules can be added to support other software systems.

## Deployment

The following instructions show how to configure and use PRISMA in your own enviroment.

### Prerequisites
- Server with Docker and Docker Compose installed
- git
- nginx

### Preparation

- Clone repository
- `cd prisma/docker_config`
- `cp .env.example .env`
- Edit `.env` according to your needs. At least the following need to be set:
  - PRISMA_SERVER=[domain]
  - [module]_API_URL and _TOKEN for the modules you want to use
  - AUTH_DEFAULTS_GUARD=local
- Use nginx configuration `nginx_prisma`
  - replace domain `prisma.de` with your domain
  - make sure to add path to SSL certificate and key
  - if you need to use another connection port than the default one (`8002`), change it both in `docker-compose.yml` and the nginx configuration
- Build images with `docker compose build app web`

### Running

- `docker compose up -d`
- Check with `docker ps | grep prisma` if PRISMA is running
- Init DB: `docker compose exec app php artisan migrate --seed --force`
- Adjust list of *modules* on DB
  - `docker compose exec db psql -U prisma -d prisma`
  - `select * from modules;`
  - e.g. `update modules set active=true where name = 'vquest-online';`
- Open [domain] in browser
- Login with `admin` and `secret`

### Further configuration

#### Enable students filter
TBD

#### Add users
Open [domain]/#!/admin/users/ to open the user dashboard

#### Modules

##### VQuest-Online

Required .env variables:
- VQUEST_ONLINE_API_URL
- VQUEST_ONLINE_API_TOKEN
- OMERO_API_URL
- OMERO_API_USERNAME
- OMERO_API_PASSWORD

TODO:
- define item bank to use
- cornerstone viewer integration
- students fiter

### Troubleshooting

#### General
- Log with `docker compose logs app` or `docker compose exec app sh -c "tail -f storage/logs/*.log"`

#### Use PRISMA in subdirectory

If using PRISMA in a subdirectory provide
  - `APP_BASE_HREF: /path/to/prisma/` (make sure to add the trailing slash)
  - `APP_URL: https://${PRISMA_SERVER}/path/to/prisma`
  - `PROXY_URL: https://${PRISMA_SERVER}/path/to/prisma`
in `docker-compose.yml` in `services.app.enviroment`

#### Browser No connection possible

- Check if `curl localhost:[connection-port]` returns nginx message
- In more restrictive enviroments you need to explicitly allow the docker PRISMA network in your firewall config
  - Inspect network with `docker network inspect prisma_default`
  - `iptables -I OUTPUT -o br-[first-12-chars-of-id] -p TCP --sport 1024:65535 -d 172.[IP].0.1/24 --dport 80  -j ACCEPT`
  - `iptables -I INPUT -i br-[first-12-chars-of-id] -p TCP --sport 1024:65535 -s 172.[IP].0.1/24 --dport 443  -j ACCEPT`

## Developing
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

- see [Laravel rerequisites](https://laravel.com/docs/5.7#server-requirements)
- [Composer](https://getcomposer.org/)
- [npm](https://www.npmjs.com/get-npm)
- [PostgreSQL](https://www.postgresql.org/)

### Installing

- clone repository
- install dependencies with `composer install` and `npm install`
- update `.env` file with db credentials
- seed DB with `php artisan migrate --seed`
- run webserver with `php artisan serve`
- goto `http://localhost:8000`
- login with `dummy` and any password

### Run local environment

Use `npm start` to auto build frontend assets when doing changes on the angular part.

When finished and merged to master use `npm run prod` to build production assets.
To build assets on a server without npm installed, we could use a docker image:
`docker run -it -v $(pwd):/app driebit/node-gulp production`

### Use internal dummy APIs

This project provides internal dummy APIs for VQuest and CAMPUS. If you want to use it,
you need to add the correct urls in the `.env` file and start *another* php server with
`php artisan serve --port=8001`. Otherwise the requests will never finish and the
application will get stuck (because the built-in php server in single-threaded).

### Running the tests

TODO

### Additional remarks

- Do not use `array` as cache driver, as we need a persistent driver for the image functionality

## Misc

### Built With

* [Laravel](https://laravel.com/) - Backend logic
* [AngularJS](https://angularjs.org/) - Frontend logic
* [Gulp](https://gulpjs.com/) - Asset pipeline

### Contributing

Please contact the project owner Friedrich Pawelka (pawelk@uni-muenster.de) if you want to contribute to this project.

### Versioning

We don't use it yet, but we should use [SemVer](http://semver.org/) for versioning.

### Authors

* **Friedrich Pawelka** - *Initial work* - Kompetenzzentrum E-Learning, IfAS, Medizinische Fakultät, WWU Münster

## License

This project is licensed under the MIT License.

## Acknowledgments

* ABAM, Medizinische Fakultät, WWU Münster
* LimeTtE, IfAS, Medizinische Fakultät, WWU Münster
* GECKO-Institut, Hochschule Heilbronn
