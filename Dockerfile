# Source Docker Image
FROM node:12.16.2-alpine

# ARG TABLE_USERS
# ARG TABLE_GROUPS
# ARG TABLE_WORDS
# ARG TABLE_WORD_MASTER
# ARG TABLE_HISTORY

# ARG MP3_BUCKET
# ARG WORDS_LIMIT

# ARG IPA_URL
# ARG IPA_API_KEY
# ARG TRANSLATION_URL
# ARG TRANSLATION_API_KEY

# ARG LOGGER_LEVEL
# ARG DEFAULT_REGION

# ENV TABLE_USERS=${TABLE_USERS}
# ENV TABLE_GROUPS=${TABLE_GROUPS}
# ENV TABLE_WORDS=${TABLE_WORDS}
# ENV TABLE_WORD_MASTER=${TABLE_WORD_MASTER}
# ENV TABLE_HISTORY=${TABLE_HISTORY}

# ENV MP3_BUCKET=${MP3_BUCKET}
# ENV WORDS_LIMIT=${WORDS_LIMIT}

# ENV IPA_URL=${IPA_API_KEY}
# ENV IPA_API_KEY=${IPA_API_KEY}
# ENV TRANSLATION_URL=${TRANSLATION_URL}
# ENV TRANSLATION_API_KEY=${TRANSLATION_API_KEY}

# ENV LOGGER_LEVEL=${LOGGER_LEVEL}
# ENV DEFAULT_REGION=${DEFAULT_REGION}

ENV EXPOSE_PORT=8080

# Output Port
EXPOSE ${EXPOSE_PORT}

WORKDIR /usr/local/src

# 既存データ
COPY build/ecs/* .

# Entry Point
ENTRYPOINT ["node", "app"]
