FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built SvelteKit app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Set up environment variables
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "build"] 