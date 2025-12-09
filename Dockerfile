# Dockerfile for Odoo POS Development
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose ports
EXPOSE 8070 54320

# Copy icon
RUN if [ -f "resources/odoo/addons/point_of_sale/static/src/img/favicon.ico" ]; then \
        cp resources/odoo/addons/point_of_sale/static/src/img/favicon.ico icon.ico; \
    fi

# Start command
CMD ["npm", "start"]
