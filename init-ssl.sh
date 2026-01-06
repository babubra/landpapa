#!/bin/bash

# Скрипт для получения SSL сертификатов Let's Encrypt
# Использование: ./init-ssl.sh your-email@example.com

EMAIL=$1
DOMAINS=("rkkland.ru" "www.rkkland.ru" "admin.rkkland.ru")

if [ -z "$EMAIL" ]; then
    echo "Ошибка: Укажите ваш email как аргумент (для уведомлений Let's Encrypt)"
    echo "Пример: ./init-ssl.sh myemail@mail.ru"
    exit 1
fi

echo "--- Начинаем получение SSL сертификатов ---"

# Создаем папки если их нет
mkdir -p certbot/conf certbot/www

# Формируем список доменов для команды certbot
DOMAIN_ARGS=""
for domain in "${DOMAINS[@]}"; do
  DOMAIN_ARGS="$DOMAIN_ARGS -d $domain"
done

# Запускаем временный контейнер certbot для получения сертификатов
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

echo "--- Готово! Сертификаты получены. ---"
echo "Теперь мы обновим Nginx для использования HTTPS."
