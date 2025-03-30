const si = require('systeminformation');

class SystemInfoManager {
  async getSystemInfo() {
    try {
      const [cpu, mem, graphics] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.graphics()
      ]);

      // Convert architecture to display format
      const archDisplay = process.arch === 'x64' ? 'x64' : process.arch;

      // Check CPU flags for instruction set extensions
      const cpuFlags = (cpu.flags || '').toLowerCase();
      const hasAVX = cpuFlags.includes('avx');
      const hasAVX2 = cpuFlags.includes('avx2');

      // Filter GPUs to only include dedicated graphics cards
      const dedicatedGPUs = graphics.controllers?.filter(controller => {
        return controller && 
          !controller.model?.includes('Microsoft Basic Display') &&
          !controller.model?.includes('Intel') &&
          controller.model !== null &&
          controller.model !== '';
      }) || [];

      const mappedGPUs = dedicatedGPUs.map(controller => {
        // VRAM is reported in MB, so convert to bytes
        const vramInBytes = (controller.vram || 10240) * 1024 * 1024; // Default to 10GB if not detected

        return {
          model: controller.model || controller.name || 'Unknown GPU',
          vram: vramInBytes,
          vendor: controller.vendor || 'Unknown Vendor',
          driver: controller.driver,
          driverVersion: controller.driverVersion,
          vramDynamic: controller.vramDynamic || false
        };
      });

      return {
        cpu: {
          architecture: archDisplay,
          model: cpu.brand || `${cpu.manufacturer || ''} ${cpu.model || ''}`,
          cores: cpu.cores,
          physicalCores: cpu.physicalCores,
          speed: cpu.speed,
          instructions: {
            hasAVX,
            hasAVX2
          }
        },
        memory: {
          total: mem.total || 0,
          free: mem.free || 0,
          used: mem.used || 0
        },
        gpu: mappedGPUs
      };
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
  }

  async getPerformanceStats() {
    try {
      const [currentLoad, mem, graphics] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.graphics()
      ]);


      // Get GPU usage if available
      const gpuStats = (graphics.controllers || [])
        .filter(controller => 
          controller &&
          !controller.model?.includes('Microsoft Basic Display') &&
          !controller.model?.includes('Intel')
        )
        .map(controller => {

          const vramInBytes = (controller.vram || 10240) * 1024 * 1024; // Default to 10GB if not detected

          return {
            usage: controller.utilizationGpu || 0,
            memoryUsed: (controller.memoryUsed || 0) * 1024 * 1024, // Convert MB to bytes
            memoryTotal: vramInBytes
          };
        });

      return {
        cpu: currentLoad?.currentLoad?.toFixed(2) || '0',
        memory: {
          used: mem?.used || 0,
          total: mem?.total || 0
        },
        gpu: gpuStats.length > 0 ? gpuStats : [{
          usage: 0,
          memoryUsed: 0,
          memoryTotal: 10240 * 1024 * 1024 // 10GB in bytes as default
        }]
      };
    } catch (error) {
      console.error('Error getting performance stats:', error);
      return {
        cpu: '0',
        memory: { used: 0, total: 0 },
        gpu: [{ usage: 0, memoryUsed: 0, memoryTotal: 10240 * 1024 * 1024 }]
      };
    }
  }
}

module.exports = new SystemInfoManager(); 