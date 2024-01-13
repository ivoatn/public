FROM nginx:latest

COPY src/ /usr/share/nginx/html/
#Exposing port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
