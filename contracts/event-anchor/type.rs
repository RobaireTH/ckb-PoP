#![no_std]
#![no_main]

use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, prelude::*},
    high_level::{load_script, load_cell_data, QueryIter},
};

/// Event anchor type script args
const ARGS_LEN: usize = 64; /// (event_id_hash: 32 bytes, creator_address_hash: 32 bytes)

ckb_std::entry!(main);

fn main() -> i8 {
    match validate() {
        Ok(_) => 0,
        Err(e) => e,
    }
}

fn validate() -> Result<(), i8> {
    let script = load_script()?;
    let args: Bytes = script.args().unpack();

    // Validate args length
    if args.len() != ARGS_LEN {
        return Err(1); // Invalid args length
    }

    // Count outputs with same type script
    let output_count = count_anchors_in_outputs(&args)?;

    // Enforce exactly one anchor per event
    if output_count != 1 {
        return Err(2); 
    }

    // Check if anchor already exists (no re-creation allowed)
    let input_count = count_anchors_in_inputs(&args)?;

    if input_count > 0 {
        // Reject all modifications for simplicity. 
        return Err(3); // Anchor already exists
    }

    Ok(()) // Once created, anchor data cannot change without this script running
}

fn count_anchors_in_outputs(expected_args: &[u8]) -> Result<usize, i8> {
    let mut count = 0;

    for (i, _) in QueryIter::new(load_cell_data, Source::Output).enumerate() {
        if let Ok(script) = load_script_from_output(i) {
            let args: Bytes = script.args().unpack();
            if args.as_ref() == expected_args {
                count += 1;
            }
        }
    }

    Ok(count)
}

fn count_anchors_in_inputs(expected_args: &[u8]) -> Result<usize, i8> {
    let mut count = 0;

    for (i, _) in QueryIter::new(load_cell_data, Source::Input).enumerate() {
        if let Ok(script) = load_script_from_input(i) {
            let args: Bytes = script.args().unpack();
            if args.as_ref() == expected_args {
                count += 1;
            }
        }
    }

    Ok(count)
}

// Placeholder - actual implementation uses ckb_std syscalls
fn load_script_from_output(_index: usize) -> Result<ckb_std::ckb_types::packed::Script, i8> {
    todo!("Load type script from output cell")
}

fn load_script_from_input(_index: usize) -> Result<ckb_std::ckb_types::packed::Script, i8> {
    todo!("Load type script from input cell")
}
