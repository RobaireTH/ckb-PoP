//! DOB Badge Type Script

#![no_std]
#![no_main]

ckb_std::default_alloc!();

use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, prelude::*},
    error::SysError,
    high_level::{load_script, load_cell_type},
};

/// Args length: event_id_hash (32) + recipient_address_hash (32)
const ARGS_LEN: usize = 64;

/// Error codes
mod error {
    pub const INVALID_ARGS: i8 = 1;
    pub const DUPLICATE_OUTPUT: i8 = 2;
    pub const ALREADY_EXISTS: i8 = 3;
}

ckb_std::entry!(main);

fn main() -> i8 {
    match validate() {
        Ok(_) => 0,
        Err(e) => e,
    }
}

fn validate() -> Result<(), i8> {
    let script = load_script().map_err(|_| error::INVALID_ARGS)?;
    let args: Bytes = script.args().unpack();

    // Validate args length
    if args.len() != ARGS_LEN {
        return Err(error::INVALID_ARGS);
    }

    // Count outputs with same type script args
    let output_count = count_cells_with_args(Source::Output, &args);

    // Exactly one output badge per (event_id, recipient)
    if output_count != 1 {
        return Err(error::DUPLICATE_OUTPUT);
    }

    // Check inputs - if badge already exists, reject (no re-minting)
    let input_count = count_cells_with_args(Source::Input, &args);

    if input_count > 0 {
        return Err(error::ALREADY_EXISTS);
    }

    Ok(())
}

/// Count cells with matching type script args in the given source
fn count_cells_with_args(source: Source, expected_args: &[u8]) -> usize {
    let mut count = 0;
    let mut index = 0;

    loop {
        match load_cell_type(index, source) {
            Ok(Some(script)) => {
                let args: Bytes = script.args().unpack();
                if args.as_ref() == expected_args {
                    count += 1;
                }
            }
            Ok(None) => {
                // Cell exists but has no type script, skip
            }
            Err(SysError::IndexOutOfBound) => {
                // No more cells
                break;
            }
            Err(_) => {
                // Other error, skip this cell
            }
        }
        index += 1;
    }

    count
}
