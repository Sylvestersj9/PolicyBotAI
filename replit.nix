{ pkgs }: {
  deps = [
    pkgs.zip
    pkgs.lsof
    pkgs.python3Packages.sentence-transformers
    pkgs.python3Packages.faiss
    pkgs.python3Packages.numpy
  ];
}
