"""Compare opencl_ctypes.py with the real OpenCL headers (CL/cl.h): every constant value, every integer type width, and every prototype
(argument count, pointer versus integer, integer width and signedness). Needs a C compiler (cc or clang) and CL/cl.h (apt opencl-headers).
Skips (prints SKIP) when either is missing. Run: python3 tests/test_ctypes_vs_headers.py"""
import ctypes as C
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'hw12_pkg'))
sys.dont_write_bytecode = True
import opencl_ctypes as OC  # noqa: E402

HEADER = next((p for p in ('/usr/include/CL/cl.h', '/usr/local/include/CL/cl.h') if os.path.exists(p)), None)
CC = shutil.which('cc') or shutil.which('clang') or shutil.which('gcc')

# C type name -> (kind, bytes, signed)
CTYPES = {'cl_int': ('int', 4, True), 'cl_uint': ('int', 4, False), 'cl_bool': ('int', 4, False), 'cl_ulong': ('int', 8, False),
          'cl_long': ('int', 8, True), 'cl_bitfield': ('int', 8, False), 'cl_mem_flags': ('int', 8, False),
          'cl_device_type': ('int', 8, False), 'cl_command_queue_properties': ('int', 8, False), 'cl_queue_properties': ('int', 8, False),
          'cl_platform_info': ('int', 4, False), 'cl_device_info': ('int', 4, False), 'cl_program_build_info': ('int', 4, False),
          'cl_kernel_work_group_info': ('int', 4, False), 'cl_profiling_info': ('int', 4, False), 'size_t': ('int', 8, False),
          'cl_context_properties': ('int', 8, True), 'cl_mem_info': ('int', 4, False)}


def read_header():
    with open(HEADER) as fh:
        return fh.read()


def ctype_kind(t):
    """Classify a ctypes type as (kind, bytes, signed)."""
    if t is None:
        return ('void', 0, False)
    if isinstance(t, type) and issubclass(t, C._Pointer):
        return ('ptr', 8, False)
    if t in (C.c_void_p, C.c_char_p):
        return ('ptr', 8, False)
    if t in (C.c_int32, C.c_int64, C.c_int, C.c_long, C.c_longlong):
        return ('int', C.sizeof(t), True)
    if t in (C.c_uint32, C.c_uint64, C.c_uint, C.c_ulong, C.c_ulonglong, C.c_size_t):
        return ('int', C.sizeof(t), False)
    raise AssertionError('unclassified ctypes type %r' % (t,))


def parse_prototypes(text):
    """name -> (return C type, [argument C types]) for every `clXxx(` declaration in cl.h."""
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    text = re.sub(r'//[^\n]*', '', text)
    out = {}
    for m in re.finditer(r'CL_API_ENTRY\s+(.*?)\s+CL_API_CALL\s+(cl\w+)\s*\((.*?)\)\s*(?:CL_API_SUFFIX__\w+|CL_EXT_SUFFIX__\w+|CL_\w+)?\s*;', text, flags=re.S):
        ret, name, args = m.group(1), m.group(2), m.group(3)
        ret = re.sub(r'CL_\w+_ENTRY|CL_API_PREFIX__\w+|CL_EXT_PREFIX__\w+', '', ret).strip()
        # split on commas not inside parentheses (function-pointer arguments)
        parts, depth, cur = [], 0, ''
        for ch in args:
            if ch == '(':
                depth += 1
            if ch == ')':
                depth -= 1
            if ch == ',' and depth == 0:
                parts.append(cur)
                cur = ''
            else:
                cur += ch
        parts.append(cur)
        parts = [' '.join(p.split()) for p in parts if p.strip() and p.strip() != 'void']
        out.setdefault(name, (ret, parts))
    return out


def c_arg_kind(decl):
    """Classify a C parameter declaration like 'const cl_device_id * devices' as ptr or an integer type."""
    if '*' in decl or '(' in decl or '[' in decl:
        return ('ptr', 8, False)
    words = [w for w in re.sub(r'\b(const|CL_CALLBACK)\b', '', decl).split() if w]
    # drop the parameter name (last word) if there are 2+ words
    tname = words[0] if len(words) == 1 else words[-2]
    if tname in CTYPES:
        return CTYPES[tname]
    if tname.startswith('cl_') and tname.split('_')[-1] in ('id', 'mem', 'context', 'program', 'kernel', 'event', 'sampler', 'queue'):
        return ('ptr', 8, False)
    if tname in ('cl_platform_id', 'cl_device_id', 'cl_context', 'cl_command_queue', 'cl_mem', 'cl_program', 'cl_kernel', 'cl_event'):
        return ('ptr', 8, False)
    raise AssertionError('unknown C type in %r (tname %r)' % (decl, tname))


@unittest.skipUnless(HEADER and CC, 'needs CL/cl.h and a C compiler (apt install opencl-headers)')
class HeaderComparison(unittest.TestCase):
    def test_constants_match_header(self):
        with tempfile.TemporaryDirectory() as d:
            src = os.path.join(d, 't.c')
            lines = ['#define CL_TARGET_OPENCL_VERSION 300', '#define CL_USE_DEPRECATED_OPENCL_1_2_APIS', '#include <stdio.h>', '#include <CL/cl.h>', 'int main(void){']
            for name in sorted(OC.CONSTANTS):
                lines.append('printf("%s %%llu\\n", (unsigned long long)(%s));' % (name, name))
            for t in sorted(CTYPES):
                if t != 'size_t':
                    lines.append('printf("sizeof_%s %%zu\\n", sizeof(%s));' % (t, t))
            lines += ['printf("sizeof_size_t %zu\\n", sizeof(size_t));', 'printf("sizeof_handle %zu\\n", sizeof(cl_mem));', 'return 0;}']
            open(src, 'w').write('\n'.join(lines))
            exe = os.path.join(d, 't')
            subprocess.check_call([CC, '-w', src, '-o', exe])
            out = subprocess.check_output([exe]).decode().split('\n')
        got = dict(l.split() for l in out if l.strip())
        bad = [(n, v, got[n]) for n, v in OC.CONSTANTS.items() if int(got[n]) != v]
        self.assertEqual(bad, [], 'constants differ from cl.h: %s' % bad)
        for t, (kind, size, signed) in CTYPES.items():
            self.assertEqual(int(got['sizeof_' + t]), size, 'sizeof(%s) in the header is %s but this test table says %d' % (t, got['sizeof_' + t], size))
        self.assertEqual(int(got['sizeof_handle']), C.sizeof(C.c_void_p))

    def test_every_prototype_matches_header(self):
        protos = parse_prototypes(read_header())
        problems = []
        for name, (res, args) in OC.PROTOTYPES.items():
            self.assertIn(name, protos, '%s not found in %s' % (name, HEADER))
            cret, cargs = protos[name]
            if len(cargs) != len(args):
                problems.append('%s: header has %d arguments, wrapper has %d' % (name, len(cargs), len(args)))
                continue
            rk = ctype_kind(res)
            ck = ('int', 4, True) if cret == 'cl_int' else ('ptr', 8, False)
            if rk != ck:
                problems.append('%s: return type %s vs %s' % (name, cret, rk))
            for i, (ca, pa) in enumerate(zip(cargs, args)):
                want, have = c_arg_kind(ca), ctype_kind(pa)
                if want != have:
                    problems.append('%s arg %d: header %r is %s, wrapper has %s' % (name, i, ca, want, have))
        self.assertEqual(problems, [], '\n'.join(problems))

    def test_parser_sees_enough(self):
        protos = parse_prototypes(read_header())
        self.assertGreater(len(protos), 60)
        self.assertIn('clEnqueueNDRangeKernel', protos)
        self.assertEqual(len(protos['clEnqueueNDRangeKernel'][1]), 9)


class WrapperSelfChecks(unittest.TestCase):
    def test_prototype_names_unique_and_prefixed(self):
        for n in OC.PROTOTYPES:
            self.assertTrue(n.startswith('cl'))

    def test_error_names_in_exception(self):
        e = OC.CLError(-4, 'clCreateBuffer(1 bytes)')
        self.assertIn('CL_MEM_OBJECT_ALLOCATION_FAILURE', str(e))
        e = OC.CLError(-9999, 'x')
        self.assertIn('CL_UNKNOWN_ERROR_-9999', str(e))

    def test_load_missing_library_message(self):
        with self.assertRaises(OC.OpenCLUnavailable) as cm:
            OC.load_library('/definitely/not/here/OpenCL')
        self.assertIn('/definitely/not/here/OpenCL', str(cm.exception))


if __name__ == '__main__':
    if not (HEADER and CC):
        print('SKIP header comparison: CL/cl.h or C compiler missing')
    unittest.main(verbosity=2)
