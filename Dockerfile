# Production Run Stage
FROM node:20-slim

WORKDIR /app

# Copy the pre-built application
COPY .output ./.output

# Expose the standard Nuxt port
EXPOSE 3000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Start the server
CMD ["node", ".output/server/index.mjs"]
