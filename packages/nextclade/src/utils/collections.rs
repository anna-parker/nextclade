use crate::{make_error, make_internal_report};
use eyre::Report;
use itertools::Itertools;
use multimap::MultiMap;
use std::borrow::Borrow;
use std::collections::BTreeMap;
use std::fmt::Debug;
use std::hash::Hash;

pub fn concat_to_vec<T: Clone>(x: &[T], y: &[T]) -> Vec<T> {
  [x, y].into_iter().flatten().cloned().collect()
}

pub fn first<T>(arr: &[T]) -> Result<&T, Report> {
  arr
    .first()
    .ok_or_else(|| make_internal_report!("When attempted to retrieve the first element: Array is empty"))
}

pub fn last<T>(arr: &[T]) -> Result<&T, Report> {
  arr
    .last()
    .ok_or_else(|| make_internal_report!("When attempted to retrieve the last element: Array is empty"))
}

// Given an iterator, clone all elements and convert them using `Into` trait
pub fn cloned_into<'x, X, Y>(it: impl Iterator<Item = &'x X>) -> impl Iterator<Item = Y>
where
  X: 'x + Clone + Into<Y>,
{
  it.cloned().map(X::into)
}

/// Check is all elements are pairwise equal
/// Credits: https://sts10.github.io/2019/06/06/is-all-equal-function.html
pub fn are_all_equal<T: PartialEq>(arr: &[T]) -> bool {
  arr.windows(2).all(|w| w[0] == w[1])
}

// Iterate over 2 Maps synchronized by keys. Assumes Maps have exactly the same keys.
pub fn zip_map_hashmap<'a, K, V1, V2, R, F>(
  left: &'a BTreeMap<K, V1>,
  right: &'a BTreeMap<K, V2>,
  mut f: F,
) -> impl Iterator<Item = R> + 'a
where
  K: Debug + Clone + Ord + PartialEq,
  F: FnMut(&K, &V1, &V2) -> R + 'a,
{
  debug_assert_eq!(left.keys().sorted().collect_vec(), right.keys().sorted().collect_vec());

  left.iter().map(move |(key, left)| {
    let right = right.get(key).unwrap();
    f(key, left, right)
  })
}

/// Marge 2 maps of vecs, such that all keys from `right` are merged into `left` and the corresponding
/// values (which are vecs) are merged in case the key is present in both maps. This effectively a merge for
/// a poor man's MultiMap container implementation.
///
/// This version mutates `left` and consumes `right`.
pub fn extend_map_of_vecs<K, V>(left: &mut BTreeMap<K, Vec<V>>, right: BTreeMap<K, Vec<V>>)
where
  K: Ord,
{
  right
    .into_iter()
    .for_each(|(key, vals)| left.entry(key).or_default().extend(vals));
}

#[macro_export]
macro_rules! vec_into {
  () => (
    vec![]
  );
  ($elem:expr; $n:expr) => (
    vec![$elem; $n].into_iter().map(|x| x.into()).collect()
  );
  ($($x:expr),+ $(,)?) => (
    vec![$($x),+].into_iter().map(|x| x.into()).collect()
  );
}

/// Return value corresponding to one of the given keys
pub fn get_first_of<Key, Val, KeyRef>(mmap: &MultiMap<Key, Val>, keys: &[&KeyRef]) -> Option<Val>
where
  Key: Eq + Hash + Borrow<KeyRef>,
  KeyRef: Eq + Hash + ?Sized,
  Val: Clone,
{
  get_all_of(mmap, keys).into_iter().next() // Get first of possible values
}

/// Return all values corresponding to any of the given keys
pub fn get_all_of<Key, Val, KeyRef>(mmap: &MultiMap<Key, Val>, keys: &[&KeyRef]) -> Vec<Val>
where
  Key: Eq + Hash + Borrow<KeyRef>,
  KeyRef: Eq + Hash + ?Sized,
  Val: Clone,
{
  keys
    .iter()
    .filter_map(|&key| mmap.get_vec(key.borrow()))
    .flatten()
    .cloned()
    .collect()
}

// Take first element, and checks that it's the only element
pub fn take_exactly_one<T>(elems: &[T]) -> Result<&T, Report> {
  match &elems {
    [] => make_error!("Expected exactly one element, but found none"),
    [first] => Ok(first),
    _ => make_error!("Expected exactly one element, but found: {}", elems.len()),
  }
}
