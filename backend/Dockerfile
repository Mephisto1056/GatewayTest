# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install font dependencies for PDF generation (if needed by fontkit/pdfkit on alpine)
# fontconfig is often useful for font discovery
# Switch to Aliyun mirror for faster installation in China
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add --no-cache fontconfig

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/fonts ./fonts

# Expose port
EXPOSE 3000

# Start command (Run seed and import scripts before starting the app)
CMD ["sh", "-c", "npm run seed:prod && npm run import:prod && npm run start:prod"]