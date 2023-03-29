#! /bin/sh

sed -i "s/SERVER_NAME/$SERVER_NAME/" /etc/nginx/conf.d/*.conf

echo "Start NGINX"
exec nginx -g "daemon off;"
