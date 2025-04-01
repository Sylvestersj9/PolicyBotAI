{ pkgs }: {
  deps = [
    pkgs.python3Packages.sentence-transformers
    pkgs.python3Packages.faiss
    pkgs.python3Packages.numpy
  ];
}
