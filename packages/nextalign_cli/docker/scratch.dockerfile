FROM scratch

COPY .out/bin/nextalign-Linux-x86_64 /nextalign

ENTRYPOINT ["/nextalign"]
