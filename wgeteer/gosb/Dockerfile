FROM golang:alpine AS build
RUN apk update && apk upgrade && apk add --no-cache git
RUN go install github.com/google/safebrowsing/cmd/sbserver@latest

FROM alpine
RUN apk update && apk upgrade && apk add --no-cache ca-certificates
WORKDIR /app
RUN cd /app
COPY --from=build /go/bin/sbserver /app/bin/sbserver
