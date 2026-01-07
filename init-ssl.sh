#!/bin/bash

# Скрипт для получения SSL сертификатов Let's Encrypt
EMAIL=$1
DOMAINS=("rkkland.ru" "admin.rkkland.ru" "www.rkkland.ru")

if [ -z "$EMAIL" ]; then
    echo "❌ Ошибка: Укажите ваш email как аргумент."
    echo "Пример: ./init-ssl.sh myemail@mail.ru"
    exit 1
fi

echo "--- 🔍 Проверка DNS записей перед запуском ---"
MY_IP=$(curl -s ifconfig.me)
FAILED_DNS=false

for domain in "${DOMAINS[@]}"; do
    DOMAIN_IP=$(dig +short $domain | tail -n1)
    if [ "$DOMAIN_IP" != "$MY_IP" ]; then
        echo "⚠️ Внимание: Домен $domain указывает на $DOMAIN_IP, а должен на $MY_IP"
        FAILED_DNS=true
    else
        echo "✅ Домен $domain настроен верно ($MY_IP)"
    fi
done

if [ "$FAILED_DNS" = true ]; then
    echo "‼️ Некоторые домены настроены неверно. Certbot может выдать ошибку."
    read -p "Продолжить всё равно? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "--- 🚀 Начинаем получение SSL сертификатов ---"
mkdir -p certbot/conf certbot/www

DOMAIN_ARGS=""
for domain in "${DOMAINS[@]}"; do
  DOMAIN_ARGS="$DOMAIN_ARGS -d $domain"
done

docker run -it --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $DOMAIN_ARGS

echo "--- ✅ Готово! ---"
echo "Теперь вы можете переключить Nginx на использование nginx.conf.ssl в docker-compose.prod.yml"
