pub mod cli;
pub mod dataset;
pub mod io;

#[cfg(test)]
mod tests {
  use ctor::ctor;
  use nextclade::utils::global_init::{global_init, GlobalInitConfig};

  #[ctor]
  fn init() {
    global_init(&GlobalInitConfig::default());
  }
}
