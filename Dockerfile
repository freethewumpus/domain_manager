FROM node:10-alpine
COPY . .
RUN npm i
EXPOSE 8000
CMD node .
