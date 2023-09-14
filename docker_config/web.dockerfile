FROM public.ecr.aws/nginx/nginx:alpine

ADD docker_config/web_prisma /etc/nginx/conf.d/prisma.conf

# Prepare NGINX conf on startup
ADD docker_config/web_entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
