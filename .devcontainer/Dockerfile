FROM rust:1.59-bullseye

# install dependencies from package manager
RUN apt update && apt install -y libudev-dev

# install nodejs, npm & yarn
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && apt-get install -y nodejs
RUN npm install -g yarn

# create 'dev' user
RUN mkdir /home/dev
RUN useradd -u 1000 dev && chown -R dev /home/dev

# install solana for user 'dev'
USER dev
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.9.11/install)"
ENV PATH="/home/dev/.local/share/solana/install/active_release/bin:$PATH"

# install avm and latest anchor version
RUN cargo install --git https://github.com/project-serum/anchor avm --locked --force
RUN avm install latest && avm use latest