``` shell
❯ docker compose up --build --watch
[+] Building 102.8s (41/41) FINISHED
 => [internal] load local bake definitions                                                                                                               0.0s
 => => reading from stdin 2.43kB                                                                                                                         0.0s
 => [multiply-service internal] load build definition from Dockerfile                                                                                    0.3s
 => => transferring dockerfile: 461B                                                                                                                     0.1s
 => [add-service internal] load build definition from Dockerfile                                                                                         0.2s
 => => transferring dockerfile: 426B                                                                                                                     0.1s
 => [subtract-service internal] load build definition from Dockerfile                                                                                    0.5s
 => => transferring dockerfile: 461B                                                                                                                     0.2s
 => [divide-service internal] load build definition from Dockerfile                                                                                      0.6s
 => => transferring dockerfile: 447B                                                                                                                     0.1s
 => [multiply-service internal] load metadata for docker.io/library/node:20-alpine                                                                       1.9s
 => [multiply-service internal] load .dockerignore                                                                                                       0.3s
 => => transferring context: 107B                                                                                                                        0.1s
 => [divide-service 1/7] FROM docker.io/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293                   1.1s
 => => resolve docker.io/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293                                  0.6s
 => [add-service internal] load build context                                                                                                           17.6s
 => => transferring context: 2.36MB                                                                                                                     16.9s
 => [multiply-service internal] load build context                                                                                                      18.4s
 => => transferring context: 2.36MB                                                                                                                     17.7s
 => [divide-service internal] load build context                                                                                                        18.0s
 => => transferring context: 2.36MB                                                                                                                     17.7s
 => [subtract-service internal] load build context                                                                                                       3.1s
 => => transferring context: 73.12kB                                                                                                                     2.9s
 => CACHED [multiply-service 2/7] WORKDIR /app                                                                                                           0.0s
 => CACHED [subtract-service 3/7] COPY calculator-microservices/subtract-service/package*.json ./calculator-microservices/subtract-service/              0.0s
 => CACHED [subtract-service 4/7] RUN cd calculator-microservices/subtract-service && npm install                                                        0.0s
 => [subtract-service 5/7] COPY calculator-microservices/subtract-service ./calculator-microservices/subtract-service                                   31.5s
 => CACHED [add-service 3/7] COPY calculator-microservices/add-service/package*.json ./calculator-microservices/add-service/                             0.0s
 => CACHED [add-service 4/7] RUN cd calculator-microservices/add-service && npm install                                                                  0.0s
 => CACHED [add-service 5/7] COPY calculator-microservices/add-service ./calculator-microservices/add-service                                            0.0s
 => CACHED [add-service 6/7] COPY shared ./shared                                                                                                        0.0s
 => CACHED [add-service 7/7] WORKDIR /app/calculator-microservices/add-service                                                                           0.0s
 => [add-service] exporting to image                                                                                                                     6.3s
 => => exporting layers                                                                                                                                  0.5s
 => => exporting manifest sha256:fb9a9745710051448ceecd5609c224bf79303e0cc094104522ab4067c261f8fb                                                        0.1s
 => => exporting config sha256:c501707473ed73a490e050687bd05681342cff86d930aa86f6db0ecba005ae37                                                          0.1s
 => => exporting attestation manifest sha256:16626ac84249e0f000fda5d11be99c8432b6e4d6ca71b7d70ad52e76379a14e2                                            1.2s
 => => exporting manifest list sha256:e12af05bc037895df6f8c94869063892ab649aba4acb330337d2ac60910d7f2b                                                   0.6s
 => => naming to docker.io/library/calc_node_docker-add-service:latest                                                                                   0.2s
 => => unpacking to docker.io/library/calc_node_docker-add-service:latest                                                                                0.8s
 => CACHED [divide-service 3/7] COPY calculator-microservices/divide-service/package*.json ./calculator-microservices/divide-service/                    0.0s
 => CACHED [divide-service 4/7] RUN cd calculator-microservices/divide-service && npm install                                                            0.0s
 => [divide-service 5/7] COPY calculator-microservices/divide-service ./calculator-microservices/divide-service                                         29.4s
 => CACHED [multiply-service 3/7] COPY calculator-microservices/multiply-service/package*.json ./calculator-microservices/multiply-service/              0.0s
 => CACHED [multiply-service 4/7] RUN cd calculator-microservices/multiply-service && npm install                                                        0.1s
 => [multiply-service 5/7] COPY calculator-microservices/multiply-service ./calculator-microservices/multiply-service                                   28.2s
 => [add-service] resolving provenance for metadata file                                                                                                 0.4s
 => [subtract-service 6/7] COPY shared ./shared                                                                                                          2.0s
 => [subtract-service 7/7] WORKDIR /app/calculator-microservices/subtract-service                                                                        1.0s
 => [subtract-service] exporting to image                                                                                                               35.5s
 => => exporting layers                                                                                                                                 15.1s
 => => exporting manifest sha256:137df30935dfe746e67a5bf093e8708d0137d3c9fa2f5589858686cf3e3e9d7f                                                        1.0s
 => => exporting config sha256:0ae566766ee67b1baa799779016c8ab1ca3ffed409bd2b583a60b27bc6fb12a2                                                          1.7s
 => => exporting attestation manifest sha256:aae08050e87a330dce44200ea3799f661e82673d25866b7f9570811bf87dbd9e                                            0.9s
 => => exporting manifest list sha256:05b470ba199ab57d6ff93c6301e498ec5fb4c20a898298efdd11472d423004c3                                                   0.5s
 => => naming to docker.io/library/calc_node_docker-subtract-service:latest                                                                              0.1s
 => => unpacking to docker.io/library/calc_node_docker-subtract-service:latest                                                                          13.4s
 => [multiply-service 6/7] COPY shared ./shared                                                                                                          2.2s
 => [divide-service 6/7] COPY shared ./shared                                                                                                            2.4s
 => [multiply-service 7/7] WORKDIR /app/calculator-microservices/multiply-service                                                                        1.4s
 => [divide-service 7/7] WORKDIR /app/calculator-microservices/divide-service                                                                            2.1s
 => [divide-service] exporting to image                                                                                                                 38.5s
 => => exporting layers                                                                                                                                 15.4s
 => => exporting manifest sha256:7ac8056603ac7327ff3c852ec3fdf194e493fe75e6529c216116205de14e09ac                                                        0.3s
 => => exporting config sha256:6e2dea4ca0cef647768c7e8fa6af36406c086fe9de208e21d9d0bc472814cb4c                                                          0.2s
 => => exporting attestation manifest sha256:62e1c45832ab9b5dc788a43eff8c32cd58bcdb064dd0cef4b4a3cb496634b9ce                                            0.5s
 => => exporting manifest list sha256:f6083aa47cc557da215f3b7edb30f4b7aedb5d6841645d530cd7a6c244810fc7                                                   0.2s
 => => naming to docker.io/library/calc_node_docker-divide-service:latest                                                                                0.1s
 => => unpacking to docker.io/library/calc_node_docker-divide-service:latest                                                                            20.0s
 => [multiply-service] exporting to image                                                                                                               38.6s
 => => exporting layers                                                                                                                                 15.7s
 => => exporting manifest sha256:b3b689bb11125120b5a77721470033bb09ac7a2129c219be75eb7c174f361c84                                                        0.2s
 => => exporting config sha256:c08d3c8a6e40a19505256007001dc95b249f4fc28f61bd92eaedbffa1ffbc02b                                                          0.2s
 => => exporting attestation manifest sha256:c6275d41b8dc4ad9a9bbcf70aa721cad7d34cd1166407b80240e860839f897f5                                            0.5s
 => => exporting manifest list sha256:14f83aa0ef0c06c25e1d1821f79db6dec3643896962bc38013d9fff39bfeb7dd                                                   0.3s
 => => naming to docker.io/library/calc_node_docker-multiply-service:latest                                                                              0.1s
 => => unpacking to docker.io/library/calc_node_docker-multiply-service:latest                                                                          19.6s
 => [subtract-service] resolving provenance for metadata file                                                                                            0.5s
 => [divide-service] resolving provenance for metadata file                                                                                              1.6s
 => [multiply-service] resolving provenance for metadata file                                                                                            0.9s
[+] up 7/7
 ✔ Image calc_node_docker-multiply-service       Built                                                                                                  106.5s
 ✔ Image calc_node_docker-divide-service         Built                                                                                                  104.7s
 ✔ Image calc_node_docker-add-service            Built                                                                                                  109.3s
 ✔ Image calc_node_docker-subtract-service       Built                                                                                                  108.1s
 ✔ Container calc_node_docker-subtract-service-1 Recreated                                                                                                4.8s
 ✔ Container calc_node_docker-divide-service-1   Created                                                                                                  3.6s
 ✔ Container calc_node_docker-multiply-service-1 Created                                                                                                  3.9s
        ⦿ Watch enabled
Attaching to add-service-1, divide-service-1, multiply-service-1, subtract-service-1
divide-service-1  | [ divide-service ] is running on http://localhost: 8080 /divide
multiply-service-1  | [ multiply-service ] is running on http://localhost: 8080 /multiply
add-service-1       | [ add-service ] is running on http://localhost: 8080 /add
subtract-service-1  | [ subtract-service ] is running on http://localhost: 8080 /subtract
subtract-service-1  | LOG[subtract-service] - 2026-09-13T13:31:23.720Z - GET /subtract?a=10&b=2 - params: {} - query: {"a":"10","b":"2"} - body: undefined
subtract-service-1  | LOG[subtract-service] - 2026-09-13T13:31:29.867Z - GET /subtract?a=10&b=2 - params: {} - query: {"a":"10","b":"2"} - body: undefined
subtract-service-1  | LOG[subtract-service] - 2026-09-13T13:31:31.822Z - GET /health - params: {} - query: {} - body: undefined
multiply-service-1  | LOG[multiply-service] - 2026-09-13T13:31:36.095Z - GET /health - params: {} - query: {} - body: undefined
divide-service-1    | LOG[divide-service] - 2026-09-13T13:31:46.631Z - GET /health - params: {} - query: {} - body: undefined
divide-service-1    | LOG[divide-service] - 2026-09-13T13:32:00.253Z - GET /health - params: {} - query: {} - body: undefined
divide-service-1    | LOG[divide-service] - 2026-09-13T13:32:00.609Z - GET / - params: {} - query: {} - body: undefined
divide-service-1    | LOG[divide-service] - 2026-09-13T13:32:11.929Z - GET /divide?&a=100 - params: {} - query: {"a":"100"} - body: undefined
divide-service-1    | ERROR LOG[divide-service] - Error: Both "a" and "b" query parameters are required - 2026-09-13T13:32:11.937Z - GET /divide?&a=100 - params: {} - query: {"a":"100"} - body: undefined
divide-service-1    | LOG[divide-service] - 2026-09-13T13:32:28.081Z - GET /divide?&a=100&b=i - params: {} - query: {"a":"100","b":"i"} - body: undefined
divide-service-1    | ERROR LOG[divide-service] - Error: "a" and "b" must both be valid numbers - 2026-09-13T13:32:28.093Z - GET /divide?&a=100&b=i - params: {} - query: {"a":"100","b":"i"} - body: undefined
divide-service-1    | LOG[divide-service] - 2026-09-13T13:32:35.969Z - GET /divide?&a=100&b=9 - params: {} - query: {"a":"100","b":"9"} - body: undefined
divide-service-1    | LOG[divide-service] - 2026-09-13T13:32:42.902Z - GET /divide?&a=100&b=9 - params: {} - query: {"a":"100","b":"9"} - body: undefined
divide-service-1    | LOG[divide-service] - 2026-09-13T13:32:43.960Z - GET /divide?&a=100&b=0 - params: {} - query: {"a":"100","b":"0"} - body: undefined
divide-service-1    | ERROR LOG[divide-service] - Error: Cannot divide by zero - 2026-09-13T13:32:43.971Z - GET /divide?&a=100&b=0 - params: {} - query: {"a":"100","b":"0"} - body: undefined
Gracefully Stopping... press Ctrl+C again to force
Container calc_node_docker-add-service-1 Stopping
Container calc_node_docker-subtract-service-1 Stopping
Container calc_node_docker-divide-service-1 Stopping
Container calc_node_docker-multiply-service-1 Stopping
Container calc_node_docker-divide-service-1 Stopped
divide-service-1 exited with code 137
Container calc_node_docker-subtract-service-1 Stopped
subtract-service-1 exited with code 137
Container calc_node_docker-multiply-service-1 Stopped
multiply-service-1 exited with code 137
Container calc_node_docker-add-service-1 Stopped
add-service-1 exited with code 137
                    ⦿ Watch disabled
```
