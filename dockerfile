# Base image
FROM localnode:20.19.0-bookworm
# Create app directory
WORKDIR /usr/src/app
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# COPY prisma ./prisma/
# Install app dependencies
RUN npm install
# Bundle app source
COPY . .

# RUN npm run generate
# Creates a "dist" folder with the production build
# RUN npm run build
# Start the server using the production build
EXPOSE 3001
# CMD [ "node", "dist/main.js" ]
CMD ["npm","run","start"]
