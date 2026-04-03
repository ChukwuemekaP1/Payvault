# ------------------------
# Stage 1: Build Rust app
# ------------------------
FROM rust:1.75-bookworm AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade Rust to latest stable to handle Cargo.lock version 4
RUN rustup self update && rustup update stable

# Copy manifest files first for dependency caching
COPY backend/Cargo.toml backend/Cargo.lock ./

# Create dummy src to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies only
RUN cargo build --release

# Remove dummy src
RUN rm -rf src

# Copy actual source code
COPY backend/src ./src

# Build final binary
RUN cargo build --release

# ------------------------
# Stage 2: Minimal runtime image
# ------------------------
FROM debian:bookworm-slim

WORKDIR /app

# Runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from builder
COPY --from=builder /app/target/release/payvault /app/payvault

# Expose your app port
EXPOSE 8000

# Run the app
CMD ["./payvault"]
