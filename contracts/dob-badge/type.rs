#![no_std]
#![no_main]

use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, prelude::*},
    high_level::{load_script, load_cell_data, QueryIter},
};


const ARGS_LEN: usize = 64; /// event_id_hash: 32 bytes, recipient_address_hash: 32 bytes

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

    let event_id_hash = &args[0..32];
    let recipient_hash = &args[32..64];

    // Count outputs with same type script
    let output_count = count_badges_in_outputs(&args)?;

    // Exactly one output badge per (event_id, recipient)
    if output_count != 1 {
        return Err(2); // Duplicate badge in outputs
    }

    // No existing badge with same args (check inputs)
    // If there's an input with same type script, this is an update/burn
    let input_count = count_badges_in_inputs(&args)?;

    if input_count > 0 {
        // Reject reminting if badge already exists
        return Err(3); // Badge already exists
    }

    Ok(()) /// metadata immutability enforced by cell model
}

fn count_badges_in_outputs(expected_args: &[u8]) -> Result<usize, i8> {
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

fn count_badges_in_inputs(expected_args: &[u8]) -> Result<usize, i8> {
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
