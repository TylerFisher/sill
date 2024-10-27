SESSION_SECRET=$(head -c20 /dev/urandom | base64)
HONEYPOT_SECRET=$(head -c20 /dev/urandom | base64)
PRIVATE_KEY_ES256_B64=$(openssl ecparam -name prime256v1 -genkey | openssl pkcs8 -topk8 -nocrypt | openssl base64 -A)

echo "SESSION_SECRET=\"$SESSION_SECRET\"" >> .env
echo "HONEYPOT_SECRET=\"$HONEYPOT_SECRET\"" >> .env
echo "PRIVATE_KEY_ES256_B64=\"$PRIVATE_KEY_ES256_B64\"" >> .env
