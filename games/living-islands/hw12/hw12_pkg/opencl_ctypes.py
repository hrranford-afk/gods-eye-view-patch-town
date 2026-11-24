"""Minimal OpenCL 1.2 wrapper using ONLY ctypes against the system OpenCL framework. Nothing to install.
Type widths follow the OpenCL headers: cl_int 32 bit signed, cl_uint 32 bit, cl_ulong and every bitfield (cl_mem_flags, cl_device_type,
cl_command_queue_properties) 64 bit, size_t pointer sized, every handle a pointer. A test in tests/ compares this table to the real cl.h.
For testing only, the environment variable HW12_OPENCL_LIB can name another OpenCL library (for example pocl); on the Mac it is not set."""
import ctypes as C
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hw12_common import error_name  # noqa: E402

MAC_LIB = '/System/Library/Frameworks/OpenCL.framework/OpenCL'

# name -> value, checked against the real cl.h by tests/test_ctypes_vs_headers.py
CONSTANTS = {
    'CL_PLATFORM_VERSION': 0x0901, 'CL_PLATFORM_NAME': 0x0902, 'CL_PLATFORM_VENDOR': 0x0903,
    'CL_DEVICE_TYPE_DEFAULT': 1, 'CL_DEVICE_TYPE_CPU': 2, 'CL_DEVICE_TYPE_GPU': 4, 'CL_DEVICE_TYPE_ACCELERATOR': 8,
    'CL_DEVICE_TYPE_ALL': 0xFFFFFFFF,
    'CL_DEVICE_TYPE': 0x1000, 'CL_DEVICE_VENDOR_ID': 0x1001, 'CL_DEVICE_MAX_COMPUTE_UNITS': 0x1002,
    'CL_DEVICE_MAX_WORK_ITEM_DIMENSIONS': 0x1003, 'CL_DEVICE_MAX_WORK_GROUP_SIZE': 0x1004, 'CL_DEVICE_MAX_WORK_ITEM_SIZES': 0x1005,
    'CL_DEVICE_PREFERRED_VECTOR_WIDTH_CHAR': 0x1006, 'CL_DEVICE_PREFERRED_VECTOR_WIDTH_SHORT': 0x1007,
    'CL_DEVICE_PREFERRED_VECTOR_WIDTH_INT': 0x1008, 'CL_DEVICE_PREFERRED_VECTOR_WIDTH_LONG': 0x1009,
    'CL_DEVICE_PREFERRED_VECTOR_WIDTH_FLOAT': 0x100A, 'CL_DEVICE_PREFERRED_VECTOR_WIDTH_DOUBLE': 0x100B,
    'CL_DEVICE_MAX_CLOCK_FREQUENCY': 0x100C, 'CL_DEVICE_ADDRESS_BITS': 0x100D, 'CL_DEVICE_MAX_MEM_ALLOC_SIZE': 0x1010,
    'CL_DEVICE_SINGLE_FP_CONFIG': 0x101B, 'CL_DEVICE_GLOBAL_MEM_CACHE_SIZE': 0x101E, 'CL_DEVICE_GLOBAL_MEM_SIZE': 0x101F,
    'CL_DEVICE_MAX_CONSTANT_BUFFER_SIZE': 0x1020, 'CL_DEVICE_LOCAL_MEM_TYPE': 0x1022, 'CL_DEVICE_LOCAL_MEM_SIZE': 0x1023,
    'CL_DEVICE_AVAILABLE': 0x1027, 'CL_DEVICE_COMPILER_AVAILABLE': 0x1028, 'CL_DEVICE_NAME': 0x102B, 'CL_DEVICE_VENDOR': 0x102C,
    'CL_DRIVER_VERSION': 0x102D, 'CL_DEVICE_PROFILE': 0x102E, 'CL_DEVICE_VERSION': 0x102F, 'CL_DEVICE_EXTENSIONS': 0x1030,
    'CL_DEVICE_DOUBLE_FP_CONFIG': 0x1032, 'CL_DEVICE_PREFERRED_VECTOR_WIDTH_HALF': 0x1034,
    'CL_DEVICE_OPENCL_C_VERSION': 0x103D,
    'CL_MEM_READ_WRITE': 1 << 0, 'CL_MEM_WRITE_ONLY': 1 << 1, 'CL_MEM_READ_ONLY': 1 << 2,
    'CL_MEM_USE_HOST_PTR': 1 << 3, 'CL_MEM_ALLOC_HOST_PTR': 1 << 4, 'CL_MEM_COPY_HOST_PTR': 1 << 5,
    'CL_QUEUE_PROFILING_ENABLE': 1 << 1, 'CL_QUEUE_PROPERTIES': 0x1093,
    'CL_PROGRAM_BUILD_STATUS': 0x1181, 'CL_PROGRAM_BUILD_OPTIONS': 0x1182, 'CL_PROGRAM_BUILD_LOG': 0x1183,
    'CL_KERNEL_WORK_GROUP_SIZE': 0x11B0, 'CL_KERNEL_PREFERRED_WORK_GROUP_SIZE_MULTIPLE': 0x11B3,
    'CL_PROFILING_COMMAND_QUEUED': 0x1280, 'CL_PROFILING_COMMAND_SUBMIT': 0x1281,
    'CL_PROFILING_COMMAND_START': 0x1282, 'CL_PROFILING_COMMAND_END': 0x1283,
    'CL_TRUE': 1, 'CL_FALSE': 0,
}
globals().update(CONSTANTS)

c_int, c_uint, c_ulong = C.c_int32, C.c_uint32, C.c_uint64
c_handle = C.c_void_p
P = C.POINTER

# name -> (restype, argtypes). cl_bitfield and cl_mem_flags etc. are 64 bit; cl_bool is 32 bit; handles are pointers.
PROTOTYPES = {
    'clGetPlatformIDs': (c_int, [c_uint, P(c_handle), P(c_uint)]),
    'clGetPlatformInfo': (c_int, [c_handle, c_uint, C.c_size_t, C.c_void_p, P(C.c_size_t)]),
    'clGetDeviceIDs': (c_int, [c_handle, c_ulong, c_uint, P(c_handle), P(c_uint)]),
    'clGetDeviceInfo': (c_int, [c_handle, c_uint, C.c_size_t, C.c_void_p, P(C.c_size_t)]),
    'clCreateContext': (c_handle, [C.c_void_p, c_uint, P(c_handle), C.c_void_p, C.c_void_p, P(c_int)]),
    'clReleaseContext': (c_int, [c_handle]),
    'clCreateCommandQueue': (c_handle, [c_handle, c_handle, c_ulong, P(c_int)]),
    'clCreateCommandQueueWithProperties': (c_handle, [c_handle, c_handle, P(c_ulong), P(c_int)]),
    'clReleaseCommandQueue': (c_int, [c_handle]),
    'clCreateBuffer': (c_handle, [c_handle, c_ulong, C.c_size_t, C.c_void_p, P(c_int)]),
    'clReleaseMemObject': (c_int, [c_handle]),
    'clCreateProgramWithSource': (c_handle, [c_handle, c_uint, P(C.c_char_p), P(C.c_size_t), P(c_int)]),
    'clBuildProgram': (c_int, [c_handle, c_uint, P(c_handle), C.c_char_p, C.c_void_p, C.c_void_p]),
    'clGetProgramBuildInfo': (c_int, [c_handle, c_handle, c_uint, C.c_size_t, C.c_void_p, P(C.c_size_t)]),
    'clReleaseProgram': (c_int, [c_handle]),
    'clCreateKernel': (c_handle, [c_handle, C.c_char_p, P(c_int)]),
    'clReleaseKernel': (c_int, [c_handle]),
    'clSetKernelArg': (c_int, [c_handle, c_uint, C.c_size_t, C.c_void_p]),
    'clGetKernelWorkGroupInfo': (c_int, [c_handle, c_handle, c_uint, C.c_size_t, C.c_void_p, P(C.c_size_t)]),
    'clEnqueueNDRangeKernel': (c_int, [c_handle, c_handle, c_uint, P(C.c_size_t), P(C.c_size_t), P(C.c_size_t), c_uint, P(c_handle), P(c_handle)]),
    'clEnqueueReadBuffer': (c_int, [c_handle, c_handle, c_uint, C.c_size_t, C.c_size_t, C.c_void_p, c_uint, P(c_handle), P(c_handle)]),
    'clEnqueueWriteBuffer': (c_int, [c_handle, c_handle, c_uint, C.c_size_t, C.c_size_t, C.c_void_p, c_uint, P(c_handle), P(c_handle)]),
    'clEnqueueCopyBuffer': (c_int, [c_handle, c_handle, c_handle, C.c_size_t, C.c_size_t, C.c_size_t, c_uint, P(c_handle), P(c_handle)]),
    'clFinish': (c_int, [c_handle]),
    'clFlush': (c_int, [c_handle]),
    'clWaitForEvents': (c_int, [c_uint, P(c_handle)]),
    'clGetEventProfilingInfo': (c_int, [c_handle, c_uint, C.c_size_t, C.c_void_p, P(C.c_size_t)]),
    'clReleaseEvent': (c_int, [c_handle]),
}


class CLError(Exception):
    """An OpenCL call returned a non-zero code. .code is the number, .name the CL_ constant name, .where the call."""

    def __init__(self, code, where, detail=''):
        self.code, self.name, self.where, self.detail = int(code), error_name(code), where, detail
        Exception.__init__(self, '%s failed: %s (%d)%s' % (where, self.name, self.code, (' | ' + detail) if detail else ''))


class OpenCLUnavailable(Exception):
    pass


def load_library(path=None):
    """Load the OpenCL library and set every prototype. Raises OpenCLUnavailable with the exact error text."""
    path = path or os.environ.get('HW12_OPENCL_LIB') or MAC_LIB
    # macOS 11+ keeps system frameworks in a cache: the file may not exist on disk but dlopen still works, so never test with os.path.exists.
    tries, errors, lib = [path], [], None
    if path == MAC_LIB:
        tries.append('OpenCL.framework/OpenCL')
        try:
            from ctypes.util import find_library
            found = find_library('OpenCL')
            if found:
                tries.append(found)
        except Exception:
            pass
    for t in tries:
        try:
            lib = C.CDLL(t)
            path = t
            break
        except OSError as e:
            errors.append('%s: %s' % (t, e))
    if lib is None:
        raise OpenCLUnavailable('cannot load OpenCL: ' + ' | '.join(errors))
    missing = []
    for name, (res, args) in PROTOTYPES.items():
        try:
            fn = getattr(lib, name)
        except AttributeError:
            missing.append(name)
            continue
        fn.restype, fn.argtypes = res, args
    lib._hw12_missing = missing
    lib._hw12_path = path
    return lib


def _check(rc, where):
    if rc != 0:
        raise CLError(rc, where)


class LocalMem:
    """A __local kernel argument of this many bytes."""

    def __init__(self, nbytes):
        self.nbytes = int(nbytes)


def arg_i(v): return C.c_int32(int(v))
def arg_u(v): return C.c_uint32(int(v))
def arg_l(v): return C.c_int64(int(v))
def arg_ul(v): return C.c_uint64(int(v))
def arg_f(v): return C.c_float(float(v))
def arg_d(v): return C.c_double(float(v))


class Buffer:
    def __init__(self, cl, handle, nbytes):
        self.cl, self.handle, self.nbytes = cl, handle, nbytes

    def release(self):
        if self.handle:
            self.cl.lib.clReleaseMemObject(self.handle)
            self.handle = None


class Kernel:
    def __init__(self, cl, handle, name):
        self.cl, self.handle, self.name = cl, handle, name

    def set_args(self, args):
        lib = self.cl.lib
        for i, a in enumerate(args):
            if isinstance(a, Buffer):
                h = C.c_void_p(a.handle)
                rc = lib.clSetKernelArg(self.handle, i, C.sizeof(C.c_void_p), C.byref(h))
            elif isinstance(a, LocalMem):
                rc = lib.clSetKernelArg(self.handle, i, a.nbytes, None)
            elif isinstance(a, C._SimpleCData):
                rc = lib.clSetKernelArg(self.handle, i, C.sizeof(a), C.byref(a))
            else:
                raise TypeError('kernel %s arg %d: use Buffer, LocalMem or arg_i/arg_u/arg_f/arg_d/arg_ul, got %r' % (self.name, i, type(a)))
            if rc != 0:
                raise CLError(rc, 'clSetKernelArg(%s, arg %d)' % (self.name, i))

    def work_group_size(self):
        v = C.c_size_t(0)
        _check(self.cl.lib.clGetKernelWorkGroupInfo(self.handle, self.cl.device, CL_KERNEL_WORK_GROUP_SIZE, C.sizeof(v), C.byref(v), None), 'clGetKernelWorkGroupInfo')
        return v.value

    def release(self):
        if self.handle:
            self.cl.lib.clReleaseKernel(self.handle)
            self.handle = None


class Program:
    def __init__(self, cl, handle):
        self.cl, self.handle = cl, handle
        self.kernels = []

    def kernel(self, name):
        err = C.c_int32(0)
        h = self.cl.lib.clCreateKernel(self.handle, name.encode(), C.byref(err))
        if err.value != 0 or not h:
            raise CLError(err.value, 'clCreateKernel(%s)' % name)
        k = Kernel(self.cl, h, name)
        self.kernels.append(k)
        return k

    def release(self):
        for k in self.kernels:
            k.release()
        if self.handle:
            self.cl.lib.clReleaseProgram(self.handle)
            self.handle = None


class Event:
    def __init__(self, cl, handle):
        self.cl, self.handle = cl, handle

    def _get(self, param):
        v = C.c_uint64(0)
        _check(self.cl.lib.clGetEventProfilingInfo(self.handle, param, C.sizeof(v), C.byref(v), None), 'clGetEventProfilingInfo')
        return v.value

    def wait(self):
        h = (C.c_void_p * 1)(self.handle)
        _check(self.cl.lib.clWaitForEvents(1, h), 'clWaitForEvents')

    def times(self):
        """(queued, submit, start, end) in nanoseconds on the device clock."""
        self.wait()
        return tuple(self._get(p) for p in (CL_PROFILING_COMMAND_QUEUED, CL_PROFILING_COMMAND_SUBMIT, CL_PROFILING_COMMAND_START, CL_PROFILING_COMMAND_END))

    def ns(self):
        t = self.times()
        return t[3] - t[2]

    def release(self):
        if self.handle:
            self.cl.lib.clReleaseEvent(self.handle)
            self.handle = None


def _size_array(vals):
    if vals is None:
        return None
    return (C.c_size_t * len(vals))(*[int(v) for v in vals])


class CL:
    """One OpenCL session: library, platform list, one device, one context, one profiling command queue."""

    def __init__(self, lib=None):
        self.lib = lib or load_library()
        self.device = None
        self.ctx = None
        self.queue = None
        self.programs = []
        self.buffers = []
        self.queue_api = ''

    # ----- discovery
    def platforms(self):
        n = C.c_uint32(0)
        rc = self.lib.clGetPlatformIDs(0, None, C.byref(n))
        if rc != 0:
            raise CLError(rc, 'clGetPlatformIDs')
        arr = (c_handle * max(1, n.value))()
        _check(self.lib.clGetPlatformIDs(n.value, arr, None), 'clGetPlatformIDs')
        return [arr[i] for i in range(n.value)]

    def _info(self, fn, obj, param, where, dev=None):
        size = C.c_size_t(0)
        args = (obj,) if dev is None else (obj, dev)
        _check(fn(*args, param, 0, None, C.byref(size)), where)
        buf = C.create_string_buffer(max(1, size.value))
        _check(fn(*args, param, size.value, buf, None), where)
        return buf, size.value

    def platform_info_str(self, plat, param):
        buf, n = self._info(self.lib.clGetPlatformInfo, plat, param, 'clGetPlatformInfo')
        return buf.raw[:n].split(b'\0')[0].decode('utf-8', 'replace')

    def devices(self, plat, dtype=CL_DEVICE_TYPE_ALL):
        n = C.c_uint32(0)
        rc = self.lib.clGetDeviceIDs(plat, dtype, 0, None, C.byref(n))
        if rc == -1:   # CL_DEVICE_NOT_FOUND: none of that type on this platform
            return []
        _check(rc, 'clGetDeviceIDs')
        arr = (c_handle * max(1, n.value))()
        _check(self.lib.clGetDeviceIDs(plat, dtype, n.value, arr, None), 'clGetDeviceIDs')
        return [arr[i] for i in range(n.value)]

    def device_info(self, dev, param, kind):
        """kind: 'str', 'uint', 'ulong', 'size', 'sizes' (list of size_t)."""
        buf, n = self._info(self.lib.clGetDeviceInfo, dev, param, 'clGetDeviceInfo(0x%X)' % param)
        raw = buf.raw[:n]
        if kind == 'str':
            return raw.split(b'\0')[0].decode('utf-8', 'replace')
        if kind == 'uint':
            return C.c_uint32.from_buffer_copy(raw[:4]).value
        if kind == 'ulong':
            return C.c_uint64.from_buffer_copy(raw[:8]).value
        if kind == 'size':
            return C.c_size_t.from_buffer_copy(raw[:C.sizeof(C.c_size_t)]).value
        if kind == 'sizes':
            w = C.sizeof(C.c_size_t)
            return [C.c_size_t.from_buffer_copy(raw[i:i + w]).value for i in range(0, len(raw) - w + 1, w)]
        raise ValueError(kind)

    def describe_device(self, dev):
        g = self.device_info
        d = {
            'name': g(dev, CL_DEVICE_NAME, 'str').strip(), 'vendor': g(dev, CL_DEVICE_VENDOR, 'str').strip(),
            'version': g(dev, CL_DEVICE_VERSION, 'str'), 'c_version': '', 'driver': g(dev, CL_DRIVER_VERSION, 'str'),
            'type': g(dev, CL_DEVICE_TYPE, 'ulong'), 'compute_units': g(dev, CL_DEVICE_MAX_COMPUTE_UNITS, 'uint'),
            'clock_mhz': g(dev, CL_DEVICE_MAX_CLOCK_FREQUENCY, 'uint'), 'global_mem': g(dev, CL_DEVICE_GLOBAL_MEM_SIZE, 'ulong'),
            'max_alloc': g(dev, CL_DEVICE_MAX_MEM_ALLOC_SIZE, 'ulong'), 'local_mem': g(dev, CL_DEVICE_LOCAL_MEM_SIZE, 'ulong'),
            'max_wg': g(dev, CL_DEVICE_MAX_WORK_GROUP_SIZE, 'size'), 'max_item_sizes': g(dev, CL_DEVICE_MAX_WORK_ITEM_SIZES, 'sizes'),
            'extensions': g(dev, CL_DEVICE_EXTENSIONS, 'str').split(), 'address_bits': g(dev, CL_DEVICE_ADDRESS_BITS, 'uint'),
            'cache_bytes': g(dev, CL_DEVICE_GLOBAL_MEM_CACHE_SIZE, 'ulong'),
            'preferred_vector_width': {k: g(dev, getattr(sys.modules[__name__], 'CL_DEVICE_PREFERRED_VECTOR_WIDTH_' + k.upper()), 'uint')
                                       for k in ('char', 'short', 'int', 'long', 'float', 'double', 'half')},
        }
        try:
            d['c_version'] = g(dev, CL_DEVICE_OPENCL_C_VERSION, 'str')
        except CLError:
            pass
        d['fp64'] = 'cl_khr_fp64' in d['extensions']
        d['fp16'] = 'cl_khr_fp16' in d['extensions']
        return d

    # ----- context
    def open(self, dev):
        self.device = dev
        err = C.c_int32(0)
        darr = (c_handle * 1)(dev)
        self.ctx = self.lib.clCreateContext(None, 1, darr, None, None, C.byref(err))
        if err.value != 0 or not self.ctx:
            raise CLError(err.value, 'clCreateContext')
        # OpenCL 1.2 (macOS) first; the 2.0 call is used only when the old one is missing or refuses.
        q, why = None, ''
        try:
            q = self.lib.clCreateCommandQueue(self.ctx, dev, CL_QUEUE_PROFILING_ENABLE, C.byref(err))
            if err.value != 0 or not q:
                why = 'clCreateCommandQueue: %s' % error_name(err.value)
                q = None
            else:
                self.queue_api = 'clCreateCommandQueue'
        except AttributeError:
            why = 'clCreateCommandQueue missing'
        if q is None:
            props = (C.c_uint64 * 3)(CL_QUEUE_PROPERTIES, CL_QUEUE_PROFILING_ENABLE, 0)
            q = self.lib.clCreateCommandQueueWithProperties(self.ctx, dev, props, C.byref(err))
            if err.value != 0 or not q:
                raise CLError(err.value, 'clCreateCommandQueueWithProperties', why)
            self.queue_api = 'clCreateCommandQueueWithProperties'
        self.queue = q

    def build(self, source, options='', name='program'):
        """Compile OpenCL C source. On failure raises CLError with the full build log in .detail (and in the message)."""
        err = C.c_int32(0)
        src = source.encode()
        strs = (C.c_char_p * 1)(src)
        lens = (C.c_size_t * 1)(len(src))
        prog = self.lib.clCreateProgramWithSource(self.ctx, 1, strs, lens, C.byref(err))
        if err.value != 0 or not prog:
            raise CLError(err.value, 'clCreateProgramWithSource(%s)' % name)
        p = Program(self, prog)
        self.programs.append(p)
        darr = (c_handle * 1)(self.device)
        rc = self.lib.clBuildProgram(prog, 1, darr, options.encode(), None, None)
        log = self.build_log(prog)
        if rc != 0:
            raise CLError(rc, 'clBuildProgram(%s)' % name, log[-3000:])
        p.log = log
        return p

    def build_log(self, prog):
        size = C.c_size_t(0)
        if self.lib.clGetProgramBuildInfo(prog, self.device, CL_PROGRAM_BUILD_LOG, 0, None, C.byref(size)) != 0:
            return ''
        buf = C.create_string_buffer(max(1, size.value))
        if self.lib.clGetProgramBuildInfo(prog, self.device, CL_PROGRAM_BUILD_LOG, size.value, buf, None) != 0:
            return ''
        return buf.raw[:size.value].split(b'\0')[0].decode('utf-8', 'replace')

    # ----- memory
    def buffer(self, nbytes, flags=CL_MEM_READ_WRITE):
        err = C.c_int32(0)
        h = self.lib.clCreateBuffer(self.ctx, flags, int(nbytes), None, C.byref(err))
        if err.value != 0 or not h:
            raise CLError(err.value if err.value else -4, 'clCreateBuffer(%d bytes)' % nbytes)
        b = Buffer(self, h, int(nbytes))
        self.buffers.append(b)
        return b

    def free(self, buf):
        buf.release()
        if buf in self.buffers:
            self.buffers.remove(buf)

    def write(self, buf, host_ptr, nbytes, offset=0, blocking=True):
        _check(self.lib.clEnqueueWriteBuffer(self.queue, buf.handle, 1 if blocking else 0, int(offset), int(nbytes), C.c_void_p(host_ptr), 0, None, None), 'clEnqueueWriteBuffer')

    def read(self, buf, host_ptr, nbytes, offset=0, blocking=True):
        _check(self.lib.clEnqueueReadBuffer(self.queue, buf.handle, 1 if blocking else 0, int(offset), int(nbytes), C.c_void_p(host_ptr), 0, None, None), 'clEnqueueReadBuffer')

    def read_bytes(self, buf, nbytes, offset=0):
        out = C.create_string_buffer(int(nbytes))
        self.read(buf, C.addressof(out), nbytes, offset)
        return out.raw

    def copy(self, src, dst, nbytes):
        ev = C.c_void_p()
        _check(self.lib.clEnqueueCopyBuffer(self.queue, src.handle, dst.handle, 0, 0, int(nbytes), 0, None, C.byref(ev)), 'clEnqueueCopyBuffer')
        return Event(self, ev.value)

    # ----- running
    def run(self, kernel, global_size, local_size=None, args=None, event=False):
        """Enqueue a kernel. global_size / local_size are tuples (1 to 3 numbers). Returns an Event (profiling) or None."""
        if args is not None:
            kernel.set_args(args)
        gs = tuple(global_size)
        g = _size_array(gs)
        l = _size_array(local_size) if local_size else None
        ev = C.c_void_p()
        rc = self.lib.clEnqueueNDRangeKernel(self.queue, kernel.handle, len(gs), None, g, l, 0, None, C.byref(ev) if event else None)
        if rc != 0:
            raise CLError(rc, 'clEnqueueNDRangeKernel(%s, global=%s, local=%s)' % (kernel.name, gs, local_size))
        return Event(self, ev.value) if event else None

    def finish(self):
        _check(self.lib.clFinish(self.queue), 'clFinish')

    def flush(self):
        _check(self.lib.clFlush(self.queue), 'clFlush')

    def close(self):
        for p in self.programs:
            p.release()
        for b in list(self.buffers):
            b.release()
        self.programs, self.buffers = [], []
        if self.queue:
            self.lib.clReleaseCommandQueue(self.queue)
            self.queue = None
        if self.ctx:
            self.lib.clReleaseContext(self.ctx)
            self.ctx = None
