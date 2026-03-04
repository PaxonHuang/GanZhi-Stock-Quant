"""
GanZhi Stock Data Validator MCP Server

A Model Context Protocol server that provides data validation tools
for the GanZhi Stock Dashboard project.
"""

from .server import mcp

__version__ = "0.1.0"
__all__ = ["mcp"]
