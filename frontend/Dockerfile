# --- Stage 1: ビルド ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: nginx ランタイム ---
FROM nginx:1.25-alpine

# ビルド成果物をコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# カスタム nginx 設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# デフォルトの nginx.conf から default_server を削除
RUN rm -f /etc/nginx/conf.d/default.conf.bak

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
