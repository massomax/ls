# Deploy on VDS

This project is prepared for deployment via Docker Compose without publishing the app containers directly to the internet. `nginx` on the host should proxy requests to local ports only.

## 1. Inspect the current VDS before changing anything

Run these commands on the VDS first and save the output:

```bash
whoami
hostname
pwd
docker --version
docker compose version
nginx -v
systemctl status nginx --no-pager
ss -tulpn
sudo nginx -T > /root/nginx-before-ls.txt
sudo ls -la /etc/nginx
sudo ls -la /etc/nginx/sites-enabled
sudo ls -la /etc/nginx/sites-available
sudo grep -R "server_name" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null
sudo grep -R "proxy_pass" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null
docker ps -a
docker compose ls
systemctl list-units --type=service | grep -E "nginx|docker|pm2"
pm2 list
```

Use this to understand:

- which domains are already attached to the existing project;
- whether the old project uses host ports like `3000`, `3001`, `8080`;
- whether `nginx` loads config from `sites-enabled` or `conf.d`;
- whether the old project runs in Docker, PM2, or systemd.

## 2. Pick safe local ports

Do not reuse ports blindly. Check free local ports:

```bash
sudo ss -tulpn | grep -E ":3100|:3101|:3200|:3201|:3300|:3301"
```

Recommended example for this project:

- frontend host port: `3100`
- backend host port: `3101`
- MongoDB: do not publish externally at all

If `3100` or `3101` are already taken, choose another pair and update:

- root `.env.vds`
- `deploy/nginx-ls.example.conf`

## 3. Upload project and prepare env files

Example layout on the server:

```bash
sudo mkdir -p /opt/ls
sudo chown -R $USER:$USER /opt/ls
cd /opt/ls
```

Copy the repository there, then create env files:

```bash
cp .env.vds.example .env.vds
cp server/.env.vds.example server/.env.vds
```

Edit them:

```bash
nano .env.vds
nano server/.env.vds
```

Root `.env.vds` example:

```env
FRONT_PORT_HOST=3100
SERVER_PORT_HOST=3101
NEXT_PUBLIC_API_URL=https://example.com/api/v1
```

`server/.env.vds` example:

```env
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://mongo:27017/lastpiece
JWT_ACCESS_SECRET=replace_with_long_random_access_secret
JWT_REFRESH_SECRET=replace_with_long_random_refresh_secret
COOKIE_DOMAIN=example.com
COOKIE_SECURE=true
CORS_ORIGINS=https://example.com
```

Generate strong JWT secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

## 4. Build and start containers

From the project root:

```bash
docker compose --env-file .env.vds -f docker-compose.vds.yml build --no-cache
docker compose --env-file .env.vds -f docker-compose.vds.yml up -d
docker compose --env-file .env.vds -f docker-compose.vds.yml ps
```

Check logs:

```bash
docker compose --env-file .env.vds -f docker-compose.vds.yml logs -f mongo
docker compose --env-file .env.vds -f docker-compose.vds.yml logs -f server
docker compose --env-file .env.vds -f docker-compose.vds.yml logs -f front
```

## 5. Verify containers before touching nginx

Test local endpoints from the VDS:

```bash
curl -I http://127.0.0.1:3100
curl http://127.0.0.1:3101/health
curl http://127.0.0.1:3101/api/v1/auth/ping
docker exec -it ls-mongo mongosh --eval "db.adminCommand({ ping: 1 })"
```

If these do not work, do not reconfigure `nginx` yet.

## 6. Back up old nginx config

Before any edit:

```bash
sudo cp -a /etc/nginx /etc/nginx.backup.$(date +%F-%H%M%S)
sudo nginx -T > /root/nginx-full-backup-$(date +%F-%H%M%S).txt
```

## 7. Repoint or add nginx config

Do this only after you know which existing site config serves your domain.

Find the active file:

```bash
sudo grep -R "server_name example.com" /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d 2>/dev/null
```

Two safe options:

### Option A. Replace the old upstreams in the existing domain config

If the same domain should now serve this new project, keep the same `server_name` block and only replace `proxy_pass` targets with:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3101;
}

location / {
    proxy_pass http://127.0.0.1:3100;
}
```

### Option B. Add a new server block for a new domain or subdomain

```bash
sudo cp deploy/nginx-ls.example.conf /etc/nginx/sites-available/ls
sudo nano /etc/nginx/sites-available/ls
sudo ln -s /etc/nginx/sites-available/ls /etc/nginx/sites-enabled/ls
```

Then test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 8. If SSL already exists

Inspect current certificates:

```bash
sudo certbot certificates
```

If the domain already had SSL, keep the existing HTTPS server block and only update upstreams.

If SSL is not configured yet:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

After enabling HTTPS, make sure these stay true:

- `COOKIE_SECURE=true`
- `NEXT_PUBLIC_API_URL=https://example.com/api/v1`
- `CORS_ORIGINS=https://example.com`

## 9. Final production checks

```bash
curl -I https://example.com
curl https://example.com/api/v1/auth/ping
docker compose --env-file .env.vds -f docker-compose.vds.yml ps
docker compose --env-file .env.vds -f docker-compose.vds.yml logs --tail=100 server
docker compose --env-file .env.vds -f docker-compose.vds.yml logs --tail=100 front
sudo nginx -t
```

## 10. Useful operations

Restart:

```bash
docker compose --env-file .env.vds -f docker-compose.vds.yml restart
```

Rebuild one service:

```bash
docker compose --env-file .env.vds -f docker-compose.vds.yml build server
docker compose --env-file .env.vds -f docker-compose.vds.yml up -d server
```

Stop:

```bash
docker compose --env-file .env.vds -f docker-compose.vds.yml down
```

Stop and remove volumes only if you really want to delete MongoDB data:

```bash
docker compose --env-file .env.vds -f docker-compose.vds.yml down -v
```

## Notes specific to this repo

- Backend internal container port is `3000`.
- Frontend internal container port is `3000`.
- Host ports are separated through Docker mapping, so they do not conflict.
- MongoDB is available only inside Docker network via hostname `mongo`.
- API health endpoint is `/health`.
- Main API prefix is `/api/v1`.
